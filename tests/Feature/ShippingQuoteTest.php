<?php

namespace Tests\Feature;

use App\Services\InvalidShippingAddressException;
use App\Services\VeeqoShippingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShippingQuoteTest extends TestCase
{
    use RefreshDatabase;

    private const ADDRESS = [
        'first_name' => 'Jane',
        'last_name' => 'Doe',
        'address_line_1' => '1 Main St',
        'country' => 'United States',
        'state' => 'MA',
        'city' => 'Bolton',
        'postal_code' => '01740',
        'subtotal' => 92,
        'items' => [['quantity' => 1, 'weight' => 1]],
    ];

    public function test_a_carrier_rejected_address_is_flagged_as_invalid(): void
    {
        $this->mock(VeeqoShippingService::class)
            ->shouldReceive('getShippingRates')
            ->andThrow(new InvalidShippingAddressException());

        $this->postJson('/api/public/shipping/quote', self::ADDRESS)
            ->assertUnprocessable()
            ->assertJsonPath('invalid_address', true)
            ->assertJsonPath('error', (new InvalidShippingAddressException())->getMessage());
    }

    public function test_a_veeqo_outage_is_not_flagged_as_an_invalid_address(): void
    {
        $this->mock(VeeqoShippingService::class)
            ->shouldReceive('getShippingRates')
            ->andThrow(new \RuntimeException('Failed to connect to Veeqo.'));

        $this->postJson('/api/public/shipping/quote', self::ADDRESS)
            ->assertUnprocessable()
            ->assertJsonPath('invalid_address', false);
    }
}
