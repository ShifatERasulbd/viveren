<?php

namespace Tests\Unit;

use App\Http\Controllers\CheckoutOrderController;
use App\Services\UpsService;
use PHPUnit\Framework\TestCase;

class CheckoutShippingQuoteTest extends TestCase
{
    public function test_default_residential_flag_is_not_forced_for_ups_rates(): void
    {
        $service = new class extends UpsService {
            public function __construct() {}

            public function exposeResolveResidentialFlag(mixed $value): bool
            {
                return $this->resolveResidentialFlag($value);
            }
        };

        $this->assertFalse($service->exposeResolveResidentialFlag(null));
        $this->assertTrue($service->exposeResolveResidentialFlag(true));
        $this->assertFalse($service->exposeResolveResidentialFlag(false));
    }

    public function test_shipping_quote_uses_variant_weight_and_product_dimensions(): void
    {
        $controller = new class extends CheckoutOrderController {
            public function __construct() {}

            public function exposeResolvePackageDimensions(array $items): ?array
            {
                return $this->resolvePackageDimensions($items);
            }

            public function exposeEstimateWeight(array $items): float
            {
                return $this->estimateWeight($items);
            }
        };

        $items = [
            [
                'weight' => 1.5,
                'length' => 10,
                'width' => 12,
                'height' => 8,
                'quantity' => 2,
            ],
            [
                'weight' => 2.5,
                'length' => 11,
                'width' => 13,
                'height' => 9,
                'quantity' => 1,
            ],
        ];

        $dimensions = $controller->exposeResolvePackageDimensions($items);
        $this->assertSame([
            'length' => 11,
            'width' => 13,
            'height' => 9,
        ], $dimensions);

        $this->assertSame(5.5, round($controller->exposeEstimateWeight($items), 3));
    }
}
