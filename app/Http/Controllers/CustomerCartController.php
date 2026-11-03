<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerCartController extends Controller
{
    private const MAX_LINES = 100;

    private const MAX_QUANTITY = 999;

    public function index(Request $request): JsonResponse
    {
        return $this->cartResponse($request->user());
    }

    // Replace the saved cart with the storefront's current cart
    public function replace(Request $request): JsonResponse
    {
        $user = $request->user();
        $lines = $this->validatedLines($request);

        DB::transaction(function () use ($user, $lines): void {
            $user->cartItems()->whereNotIn('line_id', array_keys($lines))->delete();

            foreach ($lines as $lineId => $line) {
                $user->cartItems()->updateOrCreate(['line_id' => $lineId], $line);
            }
        });

        return $this->cartResponse($user);
    }

    // Add the guest cart a customer built before logging in on top of their saved cart
    public function merge(Request $request): JsonResponse
    {
        $user = $request->user();
        $lines = $this->validatedLines($request);

        DB::transaction(function () use ($user, $lines): void {
            $savedLines = $user->cartItems()
                ->whereIn('line_id', array_keys($lines))
                ->lockForUpdate()
                ->get()
                ->keyBy('line_id');

            foreach ($lines as $lineId => $line) {
                $saved = $savedLines->get($lineId);
                if ($saved) {
                    $line['quantity'] = min(self::MAX_QUANTITY, $saved->quantity + $line['quantity']);
                }

                $user->cartItems()->updateOrCreate(['line_id' => $lineId], $line);
            }
        });

        return $this->cartResponse($user);
    }

    private function cartResponse(User $user): JsonResponse
    {
        $items = $user->cartItems()
            ->orderBy('id')
            ->get()
            ->map->toCartLine()
            ->values();

        return response()->json(['items' => $items]);
    }

    /**
     * @return array<string, array<string, mixed>> cart_items columns keyed by line id
     */
    private function validatedLines(Request $request): array
    {
        $validated = $request->validate([
            'items' => ['present', 'array', 'max:'.self::MAX_LINES],
            'items.*.lineId' => ['required', 'string', 'max:255'],
            'items.*.productId' => ['required', 'string', 'max:255'],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.priceValue' => ['required', 'numeric', 'min:0'],
            'items.*.image' => ['nullable', 'string', 'max:5000'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.selectedColor' => ['nullable', 'string', 'max:255'],
            'items.*.selectedSize' => ['nullable', 'string', 'max:255'],
            'items.*.slug' => ['nullable', 'string', 'max:255'],
            'items.*.weight' => ['nullable', 'numeric', 'min:0'],
            'items.*.length' => ['nullable', 'numeric', 'min:0'],
            'items.*.width' => ['nullable', 'numeric', 'min:0'],
            'items.*.height' => ['nullable', 'numeric', 'min:0'],
        ]);

        $lines = [];
        foreach ($validated['items'] as $item) {
            $lines[trim($item['lineId'])] = [
                'product_id' => trim($item['productId']),
                'name' => trim($item['name']),
                'price_value' => round((float) $item['priceValue'], 2),
                'image' => $item['image'] ?? null,
                'quantity' => min(self::MAX_QUANTITY, (int) $item['quantity']),
                'selected_color' => $item['selectedColor'] ?? null,
                'selected_size' => $item['selectedSize'] ?? null,
                'slug' => $item['slug'] ?? null,
                'weight' => $item['weight'] ?? null,
                'length' => $item['length'] ?? null,
                'width' => $item['width'] ?? null,
                'height' => $item['height'] ?? null,
            ];
        }

        return $lines;
    }
}
