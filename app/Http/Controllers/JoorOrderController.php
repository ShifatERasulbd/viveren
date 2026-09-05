<?php

namespace App\Http\Controllers;

use App\Models\CheckoutOrder;
use App\Models\Color;
use App\Models\Product;
use App\Services\JoorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class JoorOrderController extends Controller
{
    private const STATUSES = ['IN_PROGRESS', 'NOTES', 'PENDING', 'APPROVED', 'SHIPPED', 'CANCELLED'];

    private ?array $colorIdByName = null;

    public function __construct(private readonly JoorService $joorService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'order_ids' => 'nullable|string',
            'status' => ['nullable', 'string', Rule::in(self::STATUSES)],
            'date_approved_start' => 'nullable|string',
            'date_approved_end' => 'nullable|string',
            'export_status' => 'nullable|string|in:SUCCESS,FAILED,UNDEFINED,',
            'last_modified' => 'nullable|date',
            'page' => 'nullable|integer|min:1',
            'page_size' => 'nullable|integer|min:1|max:200',
            'sort_by' => 'nullable|string',
            'sort_order' => 'nullable|string|in:ASCENDING,DESCENDING',
        ]);

        try {
            $result = $this->joorService->getOrders($filters);
            $orders = data_get($result, 'body.data', []);

            if (($result['ok'] ?? false) && is_array($orders)) {
                $itemsByOrderId = $this->fetchLineItemsForOrders($orders);

                foreach ($orders as $joorOrder) {
                    if (is_array($joorOrder)) {
                        $orderId = trim((string) ($joorOrder['id'] ?? ''));
                        $this->syncOrderToCheckoutOrders($joorOrder, $itemsByOrderId[$orderId] ?? []);
                    }
                }
            }

            return response()->json([
                'orders' => $this->attachPortalUrls($orders),
                'errors' => data_get($result, 'body.errors', []),
                'ok' => $result['ok'] ?? false,
            ], $result['ok'] ?? false ? 200 : 502);
        } catch (Throwable $exception) {
            Log::warning('Failed to fetch orders from JOOR.', ['error' => $exception->getMessage()]);

            return response()->json([
                'message' => $exception->getMessage(),
            ], 500);
        }
    }

    // GET /orders/sku_line_items — the per-order product/color/size breakdown.
    public function items(string $id): JsonResponse
    {
        try {
            $result = $this->joorService->getOrderItems($id);

            return response()->json([
                'order' => data_get($result, 'body'),
                'errors' => data_get($result, 'body.errors', []),
                'ok' => $result['ok'] ?? false,
            ], $result['ok'] ?? false ? 200 : 502);
        } catch (Throwable $exception) {
            Log::warning('Failed to fetch order items from JOOR.', ['order_id' => $id, 'error' => $exception->getMessage()]);

            return response()->json([
                'message' => $exception->getMessage(),
            ], 500);
        }
    }

    // JOOR's GET /orders response doesn't include per-order product/color/size line
    // items (see items()/getOrderItems() for that) — link to the portal as a backup view.
    private function attachPortalUrls(mixed $orders): array
    {
        if (! is_array($orders)) {
            return [];
        }

        $baseUrl = rtrim((string) config('services.joor.portal_base_url', ''), '/');

        return array_map(function ($order) use ($baseUrl) {
            if (is_array($order) && isset($order['id']) && $baseUrl !== '') {
                $order['portal_url'] = "{$baseUrl}/ra/orders/review/{$order['id']}?tab=overview";
            }

            return $order;
        }, $orders);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateOrderPayload($request, false);
        $order = $this->buildOrderPayload($validated, false);

        try {
            $result = $this->joorService->createOrder($order);
            $errors = data_get($result, 'body.errors', []);
            $ok = $result['ok'] ?? false;
            $responseOrder = data_get($result, 'body.data.0');

            if ($ok) {
                $mergedOrder = is_array($responseOrder) ? array_merge($order, $responseOrder) : $order;
                $joorOrderId = trim((string) ($mergedOrder['id'] ?? ''));
                $this->syncOrderToCheckoutOrders($mergedOrder, $this->fetchLineItems($joorOrderId));
            }

            return response()->json([
                'message' => $ok ? 'Order created successfully in JOOR.' : $this->formatJoorErrorMessage($errors, 'JOOR rejected the order.'),
                'order' => $responseOrder,
                'errors' => $errors,
                'ok' => $ok,
            ], $ok ? 201 : 422);
        } catch (Throwable $exception) {
            Log::warning('Failed to create order in JOOR.', ['error' => $exception->getMessage()]);

            return response()->json([
                'message' => $exception->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $this->validateOrderPayload($request, true);
        $order = array_merge($this->buildOrderPayload($validated, true), ['id' => $id]);

        try {
            $result = $this->joorService->updateOrder($order);
            $errors = data_get($result, 'body.errors', []);
            $ok = $result['ok'] ?? false;
            $responseOrder = data_get($result, 'body.data.0');

            if ($ok) {
                $mergedOrder = is_array($responseOrder) ? array_merge($order, $responseOrder) : $order;
                $this->syncOrderToCheckoutOrders($mergedOrder, $this->fetchLineItems($id));
            }

            return response()->json([
                'message' => $ok ? 'Order updated successfully in JOOR.' : $this->formatJoorErrorMessage($errors, 'JOOR rejected the order update.'),
                'order' => $responseOrder,
                'errors' => $errors,
                'ok' => $ok,
            ], $ok ? 200 : 422);
        } catch (Throwable $exception) {
            Log::warning('Failed to update order in JOOR.', ['order_id' => $id, 'error' => $exception->getMessage()]);

            return response()->json([
                'message' => $exception->getMessage(),
            ], 500);
        }
    }

    // Mirrors a JOOR order (from the list endpoint or a create/update response) into
    // checkout_orders (orders_from = 'joor') for unified order reporting.
    private function syncOrderToCheckoutOrders(array $joorOrder, array $lineItems = []): void
    {
        $joorOrderId = trim((string) ($joorOrder['id'] ?? ''));
        if ($joorOrderId === '') {
            return;
        }

        try {
            $shippingAddress = is_array($joorOrder['shipping_address'] ?? null)
                ? $joorOrder['shipping_address']
                : (is_array($joorOrder['custom_shipping_address'] ?? null) ? $joorOrder['custom_shipping_address'] : []);
            $buyer = is_array($joorOrder['buyer'] ?? null) ? $joorOrder['buyer'] : [];
            $customer = is_array($joorOrder['customer'] ?? null) ? $joorOrder['customer'] : [];

            $fullName = trim((string) (
                $shippingAddress['name']
                ?? $buyer['name']
                ?? $customer['name']
                ?? $customer['buyer_name']
                ?? ''
            ));
            $nameParts = $fullName !== '' ? preg_split('/\s+/', $fullName, 2) : [];
            $total = (float) ($joorOrder['total'] ?? $joorOrder['shipping_price'] ?? 0);
            $itemsCount = $lineItems !== [] ? array_sum(array_column($lineItems, 'quantity')) : (int) ($joorOrder['quantity'] ?? 0);

            CheckoutOrder::query()->updateOrCreate(
                ['order_number' => 'JOOR-' . $joorOrderId],
                [
                    'first_name' => $nameParts[0] ?? 'JOOR',
                    'last_name' => $nameParts[1] ?? 'Customer',
                    'email' => (string) ($buyer['email'] ?? $shippingAddress['email'] ?? ''),
                    'phone' => $shippingAddress['phone'] ?? null,
                    'orders_from' => 'joor',
                    'address_line_1' => (string) ($shippingAddress['line1'] ?? ''),
                    'address_line_2' => $shippingAddress['line2'] ?? null,
                    'city' => (string) ($shippingAddress['city'] ?? ''),
                    'state' => $shippingAddress['state'] ?? null,
                    'postal_code' => $shippingAddress['zip'] ?? null,
                    'country' => $shippingAddress['country'] ?? null,
                    'notes' => $joorOrder['comments'] ?? $joorOrder['internal_comments'] ?? null,
                    'items_count' => $itemsCount,
                    'subtotal' => $total,
                    'shipping' => 0,
                    'total' => $total,
                    'items' => $lineItems,
                    'payment_provider' => 'joor',
                    'payment_status' => null,
                    'courier_reference' => $joorOrder['tracking_number'] ?? null,
                    'status' => $this->mapJoorStatusToCheckoutStatus((string) ($joorOrder['status'] ?? '')),
                ],
            );
        } catch (Throwable $exception) {
            Log::warning('Failed to mirror JOOR order into checkout_orders.', [
                'joor_order_id' => $joorOrderId,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    // Batches GET /orders/sku_line_items for every order id in one request, grouped back by order_id.
    private function fetchLineItemsForOrders(array $orders): array
    {
        $orderIds = array_values(array_unique(array_filter(array_map(
            static fn ($order): string => is_array($order) ? trim((string) ($order['id'] ?? '')) : '',
            $orders,
        ))));

        if ($orderIds === []) {
            return [];
        }

        try {
            $result = $this->joorService->getOrderItems(implode(',', $orderIds));
            $rows = data_get($result, 'body.data', []);

            if (! ($result['ok'] ?? false) || ! is_array($rows)) {
                return [];
            }

            $rowsByOrderId = [];
            foreach ($rows as $row) {
                $orderId = is_array($row) ? trim((string) ($row['order_id'] ?? '')) : '';
                if ($orderId === '') {
                    continue;
                }

                $rowsByOrderId[$orderId][] = $row;
            }

            return array_map(fn (array $orderRows): array => $this->mapJoorLineItems($orderRows), $rowsByOrderId);
        } catch (Throwable $exception) {
            Log::warning('Failed to fetch JOOR order line items.', ['order_ids' => $orderIds, 'error' => $exception->getMessage()]);

            return [];
        }
    }

    // Fetches and maps sku_line_items for a single order id.
    private function fetchLineItems(string $orderId): array
    {
        if ($orderId === '') {
            return [];
        }

        try {
            $result = $this->joorService->getOrderItems($orderId);
            $rows = data_get($result, 'body.data', []);

            if (! ($result['ok'] ?? false) || ! is_array($rows)) {
                return [];
            }

            return $this->mapJoorLineItems($rows);
        } catch (Throwable $exception) {
            Log::warning('Failed to fetch JOOR order line items.', ['order_id' => $orderId, 'error' => $exception->getMessage()]);

            return [];
        }
    }

    // Normalizes JOOR's sku_line_items rows into the same item shape checkout_orders.items uses elsewhere.
    private function mapJoorLineItems(array $rows): array
    {
        $items = [];

        foreach ($rows as $row) {
            if (! is_array($row) || ($row['cancelled'] ?? false)) {
                continue;
            }

            $sku = is_array($row['line_item_sku'] ?? null) ? $row['line_item_sku'] : [];
            $product = is_array($sku['product'] ?? null) ? $sku['product'] : [];
            $traits = is_array($sku['trait_values'] ?? null) ? $sku['trait_values'] : [];

            $findTrait = static function (string $needle) use ($traits): ?string {
                foreach ($traits as $trait) {
                    if (strtolower((string) data_get($trait, 'trait.name', '')) === $needle) {
                        return (string) ($trait['value'] ?? '');
                    }
                }

                return null;
            };

            $productName = $product['name'] ?? $product['identifier'] ?? $product['external_id'] ?? '-';
            $color = $findTrait('color');

            $items[] = [
                'lineId' => 'joor-' . ($row['id'] ?? uniqid()),
                'productId' => $product['id'] ?? null,
                'sku' => $sku['sku_identifier'] ?? null,
                'name' => $productName,
                'priceValue' => (float) ($sku['item_price'] ?? $sku['wholesale_price'] ?? 0),
                'quantity' => (int) ($row['quantity'] ?? 1),
                'selectedColor' => $color,
                'selectedSize' => $findTrait('size'),
                'image' => $this->resolveJoorItemImage($product['external_id'] ?? $product['identifier'] ?? null, $productName, $color),
            ];
        }

        return $items;
    }

    // Looks up our own Product catalog (by JOOR's external_id/identifier, which is our `sku`
    // column, falling back to an exact name match) to find a color-specific product image.
    private function resolveJoorItemImage(?string $sku, ?string $productName, ?string $color): ?string
    {
        $sku = trim((string) $sku);
        $productName = trim((string) $productName);

        $product = null;
        if ($sku !== '') {
            $product = Product::query()->where('sku', $sku)->first();
        }
        if (! $product && $productName !== '' && $productName !== '-') {
            $product = Product::query()->where('name', $productName)->first();
        }
        if (! $product) {
            return null;
        }

        $colorVariantImages = is_array($product->color_variant_images) ? $product->color_variant_images : [];
        $colorKey = trim((string) $color);

        if ($colorKey !== '' && $colorVariantImages !== []) {
            $candidateKeys = array_unique(array_filter([
                $colorKey,
                strtolower($colorKey),
                $this->colorIdByName()[strtolower($colorKey)] ?? null,
            ]));

            foreach ($candidateKeys as $key) {
                if (! empty($colorVariantImages[$key]) && is_array($colorVariantImages[$key])) {
                    return (string) $colorVariantImages[$key][0];
                }
            }

            foreach ($colorVariantImages as $existingKey => $images) {
                if (strtolower((string) $existingKey) === strtolower($colorKey) && ! empty($images) && is_array($images)) {
                    return (string) $images[0];
                }
            }
        }

        if (! empty($product->cover_image)) {
            return (string) $product->cover_image;
        }

        $gallery = is_array($product->image_gallery) ? $product->image_gallery : [];

        return $gallery[0] ?? null;
    }

    private function colorIdByName(): array
    {
        if ($this->colorIdByName === null) {
            $this->colorIdByName = Color::query()->pluck('id', 'name')
                ->mapWithKeys(fn ($id, $name) => [strtolower(trim((string) $name)) => (string) $id])
                ->all();
        }

        return $this->colorIdByName;
    }

    private function mapJoorStatusToCheckoutStatus(string $status): string
    {
        return match (strtoupper($status)) {
            'APPROVED' => 'approved',
            'SHIPPED' => 'shipped',
            'CANCELLED' => 'cancelled',
            'IN_PROGRESS', 'NOTES', 'PENDING' => 'pending',
            default => 'pending',
        };
    }

    private function formatJoorErrorMessage(mixed $errors, string $fallback): string
    {
        if (! is_array($errors) || $errors === []) {
            return $fallback;
        }

        $messages = array_values(array_filter(array_map(
            static fn ($error): ?string => is_array($error) ? ($error['message'] ?? null) : null,
            $errors,
        )));

        return $messages !== [] ? implode(' ', $messages) : $fallback;
    }

    private function validateOrderPayload(Request $request, bool $isUpdate): array
    {
        return $request->validate([
            'customer_id' => 'nullable|string',
            'customer_code' => 'nullable|string',
            'price_type_id' => 'nullable|string',
            'price_type_name' => 'nullable|string',
            'collection_id' => 'nullable|string',
            'collection_code' => 'nullable|string',
            'status' => ['required', 'string', Rule::in(self::STATUSES)],
            'shipping_address_id' => 'nullable|string',
            'shipping_address_code' => 'nullable|string',
            'shipping_price' => 'nullable|string',
            'shipping_method_id' => 'nullable|string',
            'shipping_method_code' => 'nullable|string',
            'billing_address_id' => 'nullable|string',
            'billing_address_code' => 'nullable|string',
            'sales_rep_id' => 'nullable|string',
            'sales_rep_code' => 'nullable|string',
            'payment_method_id' => 'nullable|string',
            'payment_method_code' => 'nullable|string',
            'tracking_number' => 'nullable|string',
            'export_status' => 'nullable|string|in:SUCCESS,FAILED,UNDEFINED,',
            'export_description' => 'nullable|string',
            'po_number' => 'nullable|string',
            'comments' => 'nullable|string',
            'internal_comments' => 'nullable|string',
            'delivery_window_start' => 'nullable|date_format:Y-m-d',
            'delivery_window_end' => 'nullable|date_format:Y-m-d',

            'warehouse' => 'nullable|array',
            'warehouse.id' => 'nullable|string',
            'warehouse.code' => 'nullable|string',
            'warehouse.name' => 'nullable|string',

            'season' => 'nullable|array',
            'season.id' => 'nullable|string',
            'season.code' => 'nullable|string',

            'customer_group' => 'nullable|array',
            'customer_group.name' => 'nullable|string',
            'customer_group.code' => 'nullable|string',

            'company_number' => 'nullable|array',
            'company_number.name' => 'nullable|string',
            'company_number.code' => 'nullable|string',

            'buyer' => 'nullable|array',
            'buyer.id' => 'nullable|string',
            'buyer.name' => 'nullable|string',
            'buyer.email' => 'nullable|email',

            'custom_shipping_address' => 'nullable|array',
            'custom_shipping_address.name' => 'nullable|string',
            'custom_shipping_address.company' => 'nullable|string',
            'custom_shipping_address.line1' => 'nullable|string',
            'custom_shipping_address.line2' => 'nullable|string',
            'custom_shipping_address.city' => 'nullable|string',
            'custom_shipping_address.state' => 'nullable|string',
            'custom_shipping_address.zip' => 'nullable|string',
            'custom_shipping_address.country' => 'nullable|string',
            'custom_shipping_address.phone' => 'nullable|string',
            'custom_shipping_address.fax' => 'nullable|string',
            'custom_shipping_address.email' => 'nullable|string',

            'custom_billing_address' => 'nullable|array',
            'custom_billing_address.name' => 'nullable|string',
            'custom_billing_address.company' => 'nullable|string',
            'custom_billing_address.line1' => 'nullable|string',
            'custom_billing_address.line2' => 'nullable|string',
            'custom_billing_address.city' => 'nullable|string',
            'custom_billing_address.state' => 'nullable|string',
            'custom_billing_address.zip' => 'nullable|string',
            'custom_billing_address.country' => 'nullable|string',
            'custom_billing_address.phone' => 'nullable|string',

            'tax' => 'nullable|array',
            'tax.amount' => 'nullable|numeric',
            'tax.number' => 'nullable|string',

            'discount' => 'nullable|array',
            'discount.discount' => 'nullable|numeric',
            'discount.details' => 'nullable|array',
            'discount.details.*.type' => ['nullable', 'string', Rule::in(['PERCENTAGE', 'AMOUNT'])],
            'discount.details.*.value' => 'nullable|numeric',

            'event' => 'nullable|array',
            'event.event' => 'nullable|string',
            'event.code' => 'nullable|string',

            'type' => 'nullable|array',
            'type.id' => 'nullable|string',
            'type.name' => 'nullable|string',
            'type.code' => 'nullable|string',

            // "door" is only accepted by JOOR's update-order endpoint, not create.
            'door' => 'nullable|array',
            'door.id' => 'nullable|string',
            'door.code' => 'nullable|string',
            'door.name' => 'nullable|string',

            // Free-form JSON for anything not explicitly covered above.
            'advanced' => 'nullable|array',
        ]);
    }

    private function buildOrderPayload(array $validated, bool $isUpdate): array
    {
        $advanced = is_array($validated['advanced'] ?? null) ? $validated['advanced'] : [];
        unset($validated['advanced']);

        // "door" is only accepted by JOOR's update-order endpoint, not create.
        if (! $isUpdate) {
            unset($validated['door']);
        }

        $order = array_merge($this->filterEmptyValues($validated), $advanced);

        return $order;
    }

    private function filterEmptyValues(array $data): array
    {
        $result = [];

        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $filtered = $this->filterEmptyValues($value);
                if ($filtered !== []) {
                    $result[$key] = $filtered;
                }
                continue;
            }

            if ($value !== null && $value !== '') {
                $result[$key] = $value;
            }
        }

        return $result;
    }
}