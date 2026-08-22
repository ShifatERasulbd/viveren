<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Services\JoorService;
use Tests\TestCase;

class JoorServiceTest extends TestCase
{
    public function test_build_product_payload_only_sends_supported_fields(): void
    {
        $product = Product::make([
            'name' => 'Test Product',
            'sku' => 'SKU-123',
            'description' => 'Test description',
            'price' => '129.99',
            'cover_image' => '/uploads/products/test-cover.jpg',
            'image_gallery' => ['/uploads/products/test-gallery-1.jpg', '/uploads/products/test-gallery-2.jpg'],
        ]);

        $service = new class extends JoorService
        {
            public function buildForTest(Product $product, array $query = ['account' => 'acct-1']): array
            {
                return $this->buildProductPayload($product, $query);
            }
        };

        $payload = $service->buildForTest($product);

        $this->assertSame('Test Product', $payload['name']);
        $this->assertSame('SKU-123', $payload['external_id']);
        $this->assertArrayNotHasKey('price', $payload);
        $this->assertArrayNotHasKey('image_url', $payload);
        $this->assertArrayNotHasKey('images', $payload);
    }

    public function test_build_sku_payload_does_not_send_price_or_image(): void
    {
        $product = Product::make([
            'sku' => 'SKU-123',
            'color' => '"Red"',
            'size' => '"M"',
            'price' => '129.99',
            'cover_image' => '/uploads/products/thumbnails/test-cover.jpg',
        ]);
        // getRawOriginal() reads from the model's original state, which make() leaves empty.
        $product->syncOriginal();

        $service = new class extends JoorService
        {
            public function buildSkuForTest(Product $product, string $joorProductId): array
            {
                return $this->buildSkuPayload($product, $joorProductId);
            }
        };

        $payload = $service->buildSkuForTest($product, 'joor-product-1');

        $this->assertNotEmpty($payload);
        $this->assertArrayNotHasKey('price', $payload[0]);
        $this->assertArrayNotHasKey('image_url', $payload[0]);
    }
}
