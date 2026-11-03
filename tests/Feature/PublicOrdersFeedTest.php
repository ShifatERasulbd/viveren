<?php

namespace Tests\Feature;

use App\Models\CheckoutOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicOrdersFeedTest extends TestCase
{
    use RefreshDatabase;

    private function createStripeOrder(): CheckoutOrder
    {
        return CheckoutOrder::create([
            'order_number' => 'ORD-TEST-0001',
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'email' => 'jane@example.com',
            'address_line_1' => '1 Main St',
            'city' => 'Toronto',
            'items_count' => 1,
            'subtotal' => 10,
            'shipping' => 5,
            'total' => 15,
            'items' => [['name' => 'Canvas Shirt', 'priceValue' => 10, 'quantity' => 1]],
            'status' => 'approved',
            'payment_provider' => 'stripe',
            'payment_status' => 'paid',
            'payment_intent_id' => 'pi_test_123',
        ]);
    }

    public function test_orders_feed_includes_stripe_payment_id(): void
    {
        config(['services.public_orders.api_key' => 'feed-test-key']);
        $order = $this->createStripeOrder();

        $this->getJson('/api/public/orders-feed', ['X-API-Key' => 'feed-test-key'])
            ->assertOk()
            ->assertJsonPath('orders.0.id', $order->id)
            ->assertJsonPath('orders.0.payment_provider', 'stripe')
            ->assertJsonPath('orders.0.payment_status', 'paid')
            ->assertJsonPath('orders.0.payment_intent_id', 'pi_test_123');

        $this->getJson("/api/public/orders-feed/{$order->id}", ['X-API-Key' => 'feed-test-key'])
            ->assertOk()
            ->assertJsonPath('order.payment_intent_id', 'pi_test_123');
    }
}
