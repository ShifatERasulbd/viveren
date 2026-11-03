<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerCartTest extends TestCase
{
    use RefreshDatabase;

    private function cartLine(string $productId, int $quantity, string $size = 'M'): array
    {
        return [
            'lineId' => "{$productId}::Black::{$size}",
            'productId' => $productId,
            'name' => "Product {$productId}",
            'priceValue' => 25.5,
            'priceLabel' => '$25.50',
            'image' => "/storage/products/{$productId}.jpg",
            'quantity' => $quantity,
            'selectedColor' => 'Black',
            'selectedSize' => $size,
            'slug' => "product-{$productId}",
            'weight' => 0.375,
            'length' => 10,
            'width' => 8,
            'height' => null,
        ];
    }

    private function actingAsCustomer(): User
    {
        $user = User::factory()->create(['user_type' => 'customer']);
        Sanctum::actingAs($user);

        return $user;
    }

    public function test_guests_cannot_access_the_saved_cart(): void
    {
        $this->getJson('/api/customer/cart')->assertUnauthorized();
        $this->postJson('/api/customer/cart/merge', ['items' => []])->assertUnauthorized();
    }

    public function test_admins_cannot_use_the_customer_cart(): void
    {
        Sanctum::actingAs(User::factory()->create(['user_type' => 'admin']));

        $this->getJson('/api/customer/cart')->assertForbidden();
    }

    public function test_merging_a_guest_cart_adds_quantities_to_saved_lines(): void
    {
        $user = $this->actingAsCustomer();
        $user->cartItems()->create([
            'line_id' => '1::Black::M',
            'product_id' => '1',
            'name' => 'Product 1',
            'price_value' => 25.5,
            'quantity' => 2,
        ]);

        $this->postJson('/api/customer/cart/merge', [
            'items' => [$this->cartLine('1', 1), $this->cartLine('2', 3)],
        ])
            ->assertOk()
            ->assertJsonCount(2, 'items')
            ->assertJsonPath('items.0.lineId', '1::Black::M')
            ->assertJsonPath('items.0.quantity', 3)
            ->assertJsonPath('items.1.lineId', '2::Black::M')
            ->assertJsonPath('items.1.quantity', 3)
            ->assertJsonPath('items.1.priceLabel', '$25.50')
            ->assertJsonPath('items.1.weight', 0.375)
            ->assertJsonPath('items.1.height', null);
    }

    public function test_replacing_the_cart_drops_removed_lines(): void
    {
        $user = $this->actingAsCustomer();

        $this->putJson('/api/customer/cart', [
            'items' => [$this->cartLine('1', 1), $this->cartLine('2', 1)],
        ])->assertOk()->assertJsonCount(2, 'items');

        $this->putJson('/api/customer/cart', [
            'items' => [$this->cartLine('2', 4)],
        ])
            ->assertOk()
            ->assertJsonCount(1, 'items')
            ->assertJsonPath('items.0.lineId', '2::Black::M')
            ->assertJsonPath('items.0.quantity', 4);

        $this->putJson('/api/customer/cart', ['items' => []])
            ->assertOk()
            ->assertJsonCount(0, 'items');

        $this->assertSame(0, $user->cartItems()->count());
    }

    public function test_each_customer_only_sees_their_own_cart(): void
    {
        $this->actingAsCustomer();
        $this->putJson('/api/customer/cart', ['items' => [$this->cartLine('1', 1)]])->assertOk();

        $this->actingAsCustomer();
        $this->getJson('/api/customer/cart')
            ->assertOk()
            ->assertJsonCount(0, 'items');
    }

    public function test_invalid_cart_lines_are_rejected(): void
    {
        $this->actingAsCustomer();

        $this->putJson('/api/customer/cart', [
            'items' => [array_merge($this->cartLine('1', 1), ['quantity' => 0])],
        ])->assertUnprocessable()->assertJsonValidationErrors('items.0.quantity');
    }
}
