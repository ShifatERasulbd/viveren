<?php

namespace App\Http\Controllers;

use App\Services\JoorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

class JoorOrderController extends Controller
{
    private const STATUSES = ['IN_PROGRESS', 'NOTES', 'PENDING', 'APPROVED', 'SHIPPED', 'CANCELLED'];

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

            return response()->json([
                'orders' => data_get($result, 'body.data', []),
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

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateOrderPayload($request, false);
        $order = $this->buildOrderPayload($validated, false);

        try {
            $result = $this->joorService->createOrder($order);
            $errors = data_get($result, 'body.errors', []);

            return response()->json([
                'message' => ($result['ok'] ?? false) ? 'Order created successfully in JOOR.' : $this->formatJoorErrorMessage($errors, 'JOOR rejected the order.'),
                'order' => data_get($result, 'body.data.0'),
                'errors' => $errors,
                'ok' => $result['ok'] ?? false,
            ], $result['ok'] ?? false ? 201 : 422);
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

            return response()->json([
                'message' => ($result['ok'] ?? false) ? 'Order updated successfully in JOOR.' : $this->formatJoorErrorMessage($errors, 'JOOR rejected the order update.'),
                'order' => data_get($result, 'body.data.0'),
                'errors' => $errors,
                'ok' => $result['ok'] ?? false,
            ], $result['ok'] ?? false ? 200 : 422);
        } catch (Throwable $exception) {
            Log::warning('Failed to update order in JOOR.', ['order_id' => $id, 'error' => $exception->getMessage()]);

            return response()->json([
                'message' => $exception->getMessage(),
            ], 500);
        }
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