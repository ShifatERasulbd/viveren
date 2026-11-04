<?php

namespace App\Http\Controllers;

use App\Models\CheckoutOrder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Public, API-key protected feed of customer return requests for external systems (e.g. Inventory).
 *
 * Viveren keeps a return request on the order itself (checkout_orders.return_*), so each feed
 * entry is an order whose return fee has been paid, and its id is the order id.
 */
class ReturnRequestFeedController extends Controller
{
    public function publicExternalIndex(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'since_id' => 'nullable|integer|min:0',
            'per_page' => 'nullable|integer|min:1|max:200',
        ]);

        $query = $this->returnRequests()->orderBy('id');

        if (! empty($validated['since_id'])) {
            $query->where('id', '>', (int) $validated['since_id']);
        }

        $orders = $query
            ->limit((int) ($validated['per_page'] ?? 100))
            ->get();

        return response()->json([
            'success' => true,
            'count' => $orders->count(),
            'return_requests' => $orders->map(fn (CheckoutOrder $order) => $this->formatExternalReturnRequest($order))->values(),
        ]);
    }

    public function publicExternalShow(int $id): JsonResponse
    {
        return response()->json([
            'success' => true,
            'return_request' => $this->formatExternalReturnRequest($this->returnRequests()->findOrFail($id)),
        ]);
    }

    /**
     * Lets Inventory reflect its return workflow status back onto the order. A refund
     * also moves the order itself to "refunded"; the other steps leave it as return_requested.
     */
    public function publicExternalUpdateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending,approved_return,product_received,rejected,refund_initiated',
        ]);

        $order = $this->returnRequests()->findOrFail($id);

        $order->return_status = $validated['status'];
        if ($validated['status'] === 'refund_initiated') {
            $order->status = 'refunded';
        }
        $order->save();

        return response()->json([
            'success' => true,
            'return_request' => $this->formatExternalReturnRequest($order->fresh()),
        ]);
    }

    private function returnRequests(): Builder
    {
        return CheckoutOrder::query()->whereNotNull('return_requested_at');
    }

    // Same shape as the 1971co store's feed, so Inventory can handle both stores the same way.
    private function formatExternalReturnRequest(CheckoutOrder $order): array
    {
        $replacements = is_array($order->return_replacements) ? $order->return_replacements : [];

        return [
            'id' => (int) $order->id,
            'order_number' => (string) $order->order_number,
            'request_reason' => Str::headline((string) $order->return_reason),
            'reason_code' => $order->return_reason,
            'status' => (string) ($order->return_status ?: 'pending'),
            'additional_text' => $order->return_comments,
            'uploaded_document' => $order->return_video_path ? url($order->return_video_path) : null,
            'wants_size_replacement' => $replacements !== [] ? 'yes' : 'no',
            'item_size_replacements' => $replacements !== [] ? $replacements : null,
            'return_fee' => $order->return_fee !== null ? (float) $order->return_fee : null,
            'return_fee_paid_at' => $order->return_fee_paid_at,
            'user_id' => $order->user_id,
            'order' => [
                'id' => (int) $order->id,
                'order_number' => (string) $order->order_number,
                'status' => (string) $order->status,
                'first_name' => (string) $order->first_name,
                'last_name' => (string) $order->last_name,
                'email' => (string) $order->email,
                'phone' => $order->phone,
                'total' => (float) $order->total,
                'items' => $order->items,
            ],
            'created_at' => $order->return_requested_at,
            'updated_at' => $order->updated_at,
        ];
    }
}
