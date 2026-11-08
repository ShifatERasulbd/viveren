<?php

namespace Tests\Feature;

use App\Models\CheckoutOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerOrderReviewTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsCustomer(): User
    {
        $user = User::factory()->create(['user_type' => 'customer']);
        Sanctum::actingAs($user);

        return $user;
    }

    private function orderFor(User $user, string $status): CheckoutOrder
    {
        return CheckoutOrder::create([
            'user_id' => $user->id,
            'order_number' => 'ORD-' . uniqid(),
            'first_name' => 'Sam',
            'last_name' => 'Lee',
            'email' => $user->email,
            'address_line_1' => '1 Main St',
            'city' => 'Austin',
            'total' => 184,
            'items' => [
                ['productId' => '12', 'name' => 'Crossover Collar Top', 'priceValue' => 92, 'quantity' => 1],
                ['productId' => '15', 'name' => 'Wide Leg Pant', 'priceValue' => 92, 'quantity' => 1],
            ],
            'status' => $status,
        ]);
    }

    public function test_customer_can_review_items_on_a_delivered_order(): void
    {
        $user = $this->actingAsCustomer();
        $order = $this->orderFor($user, 'delivered');

        $this->postJson("/api/customer/orders/{$order->id}/review", [
            'reviews' => [
                ['item_index' => 1, 'rating' => 4, 'comment' => '  Great fit  '],
            ],
        ])->assertCreated();

        $this->assertDatabaseHas('product_reviews', [
            'checkout_order_id' => $order->id,
            'user_id' => $user->id,
            'item_index' => 1,
            'product_id' => '15',
            'product_name' => 'Wide Leg Pant',
            'rating' => 4,
            'comment' => 'Great fit',
        ]);
        $this->assertDatabaseCount('product_reviews', 1);
    }

    public function test_order_responses_report_whether_the_order_was_reviewed(): void
    {
        $order = $this->orderFor($this->actingAsCustomer(), 'delivered');

        $this->getJson("/api/customer/orders/{$order->id}")->assertJsonPath('is_reviewed', false);
        $this->getJson('/api/customer/orders')->assertJsonPath('data.0.is_reviewed', false);

        $this->postJson("/api/customer/orders/{$order->id}/review", [
            'reviews' => [['item_index' => 0, 'rating' => 5]],
        ])->assertCreated();

        $this->getJson("/api/customer/orders/{$order->id}")->assertJsonPath('is_reviewed', true);
        $this->getJson('/api/customer/orders')->assertJsonPath('data.0.is_reviewed', true);
    }

    public function test_an_order_can_only_be_reviewed_once(): void
    {
        $order = $this->orderFor($this->actingAsCustomer(), 'delivered');
        $payload = ['reviews' => [['item_index' => 0, 'rating' => 5]]];

        $this->postJson("/api/customer/orders/{$order->id}/review", $payload)->assertCreated();
        $this->postJson("/api/customer/orders/{$order->id}/review", $payload)->assertStatus(422);

        $this->assertDatabaseCount('product_reviews', 1);
    }

    public function test_orders_that_are_not_delivered_cannot_be_reviewed(): void
    {
        $order = $this->orderFor($this->actingAsCustomer(), 'shipped');

        $this->postJson("/api/customer/orders/{$order->id}/review", [
            'reviews' => [['item_index' => 0, 'rating' => 5]],
        ])->assertStatus(422);

        $this->assertDatabaseCount('product_reviews', 0);
    }

    public function test_rejects_items_that_are_not_on_the_order_and_bad_ratings(): void
    {
        $order = $this->orderFor($this->actingAsCustomer(), 'delivered');
        $url = "/api/customer/orders/{$order->id}/review";

        $this->postJson($url, ['reviews' => [['item_index' => 5, 'rating' => 5]]])->assertStatus(422);
        $this->postJson($url, ['reviews' => [['item_index' => 0, 'rating' => 6]]])->assertStatus(422);
        $this->postJson($url, ['reviews' => []])->assertStatus(422);

        $this->assertDatabaseCount('product_reviews', 0);
    }

    public function test_customers_cannot_review_someone_elses_order(): void
    {
        $owner = User::factory()->create(['user_type' => 'customer']);
        $order = $this->orderFor($owner, 'delivered');
        $this->actingAsCustomer();

        $this->postJson("/api/customer/orders/{$order->id}/review", [
            'reviews' => [['item_index' => 0, 'rating' => 5]],
        ])->assertForbidden();
    }
}
