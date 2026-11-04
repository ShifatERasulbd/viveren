<?php

namespace Tests\Feature;

use App\Models\CheckoutOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicReturnRequestsFeedTest extends TestCase
{
    use RefreshDatabase;

    private const HEADERS = ['X-API-Key' => 'feed-test-key'];

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.public_orders.api_key' => 'feed-test-key']);
    }

    private function createOrder(string $orderNumber, array $attributes = []): CheckoutOrder
    {
        return CheckoutOrder::create(array_merge([
            'order_number' => $orderNumber,
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane@example.com',
            'address_line_1' => '1 Main St',
            'city' => 'Toronto',
            'items_count' => 1,
            'subtotal' => 10,
            'shipping' => 5,
            'total' => 15,
            'items' => [['name' => 'Canvas Shirt', 'selectedColor' => 'Black', 'selectedSize' => 'M', 'quantity' => 1]],
            'status' => 'delivered',
        ], $attributes));
    }

    private function createReturnRequest(string $orderNumber, array $attributes = []): CheckoutOrder
    {
        return $this->createOrder($orderNumber, array_merge([
            'status' => 'return_requested',
            'return_reason' => 'size_issue',
            'return_comments' => 'Too small',
            'return_replacements' => [['item_index' => 0, 'name' => 'Canvas Shirt', 'color' => 'Black', 'from_size' => 'M', 'to_size' => 'L']],
            'return_fee' => 5,
            'return_fee_paid_at' => now(),
            'return_requested_at' => now(),
        ], $attributes));
    }

    public function test_feed_requires_an_api_key(): void
    {
        $this->getJson('/api/public/return-requests-feed')->assertUnauthorized();
    }

    public function test_feed_lists_only_orders_with_a_paid_return_request(): void
    {
        $this->createOrder('ORD-NO-RETURN');
        // Return details saved but the fee was never paid, so it isn't a return request yet
        $this->createOrder('ORD-UNPAID', ['return_reason' => 'change_of_mind']);
        $returned = $this->createReturnRequest('ORD-RETURN');

        $this->getJson('/api/public/return-requests-feed', self::HEADERS)
            ->assertOk()
            ->assertJsonPath('count', 1)
            ->assertJsonPath('return_requests.0.id', $returned->id)
            ->assertJsonPath('return_requests.0.order_number', 'ORD-RETURN')
            ->assertJsonPath('return_requests.0.request_reason', 'Size Issue')
            ->assertJsonPath('return_requests.0.status', 'pending')
            ->assertJsonPath('return_requests.0.additional_text', 'Too small')
            ->assertJsonPath('return_requests.0.wants_size_replacement', 'yes')
            ->assertJsonPath('return_requests.0.item_size_replacements.0.to_size', 'L')
            ->assertJsonPath('return_requests.0.order.email', 'jane@example.com')
            ->assertJsonPath('return_requests.0.order.items.0.selectedSize', 'M');
    }

    public function test_feed_pages_with_since_id(): void
    {
        $first = $this->createReturnRequest('ORD-RETURN-1');
        $second = $this->createReturnRequest('ORD-RETURN-2');

        $this->getJson("/api/public/return-requests-feed?since_id={$first->id}", self::HEADERS)
            ->assertOk()
            ->assertJsonPath('count', 1)
            ->assertJsonPath('return_requests.0.id', $second->id);
    }

    public function test_show_returns_404_for_an_order_without_a_return_request(): void
    {
        $order = $this->createOrder('ORD-NO-RETURN');

        $this->getJson("/api/public/return-requests-feed/{$order->id}", self::HEADERS)->assertNotFound();
        $this->putJson("/api/public/return-requests-feed/{$order->id}/status", ['status' => 'approved_return'], self::HEADERS)
            ->assertNotFound();
    }

    public function test_status_update_is_stored_and_a_refund_marks_the_order_refunded(): void
    {
        $order = $this->createReturnRequest('ORD-RETURN');

        $this->putJson("/api/public/return-requests-feed/{$order->id}/status", ['status' => 'approved_return'], self::HEADERS)
            ->assertOk()
            ->assertJsonPath('return_request.status', 'approved_return')
            ->assertJsonPath('return_request.order.status', 'return_requested');

        $this->putJson("/api/public/return-requests-feed/{$order->id}/status", ['status' => 'refund_initiated'], self::HEADERS)
            ->assertOk()
            ->assertJsonPath('return_request.status', 'refund_initiated')
            ->assertJsonPath('return_request.order.status', 'refunded');

        $this->assertSame('refunded', $order->fresh()->status);
    }

    public function test_status_update_rejects_unknown_statuses(): void
    {
        $order = $this->createReturnRequest('ORD-RETURN');

        $this->putJson("/api/public/return-requests-feed/{$order->id}/status", ['status' => 'shipped'], self::HEADERS)
            ->assertUnprocessable();
    }
}
