<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Color;
use App\Models\GrandChilds;
use App\Models\Product;
use App\Models\Size;
use App\Models\SubCategory;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class JoorService
{
    private ?array $joorCategoriesCache = null;

    public function syncProduct(Product $product): array
    {
        $accountId = trim((string) $this->config('joor_id', ''));
        if ($accountId === '') {
            throw new RuntimeException('JOOR account ID is required (JOOR_ID).');
        }

        $query = [
            'account' => $accountId,
        ];

        $userId = trim((string) $this->config('user_id', ''));
        if ($userId !== '') {
            $query['user_id'] = $userId;
        }

        $endpoint = $this->config('products_endpoint', '/products/bulk_create');
        $payload = [
            $this->buildProductPayload($product, $query),
        ];

        $response = $this->request()->post($this->apiUrl($endpoint) . '?' . http_build_query($query), $payload);

        $body = $response->json() ?? ['raw' => $response->body()];
        $hasErrors = is_array($body) && is_array($body['errors'] ?? null) && count($body['errors']) > 0;

        if ($this->hasDuplicatedProductError($body)) {
            $updateEndpoint = '/products/bulk_update';
            $response = $this->request()->post($this->apiUrl($updateEndpoint) . '?' . http_build_query($query), $payload);
            $body = $response->json() ?? ['raw' => $response->body()];
            $hasErrors = is_array($body) && is_array($body['errors'] ?? null) && count($body['errors']) > 0;
            $endpoint = $updateEndpoint;
        }

        $skuSync = null;
        $joorProductId = data_get($body, 'data.0.id');
        $productOk = ! $hasErrors && is_scalar($joorProductId);

        if ($productOk) {
            $skuSync = $this->syncSkusForProduct($product, (string) $joorProductId, $query);
            if (! ($skuSync['ok'] ?? false)) {
                $hasErrors = true;
            }
        }

        $skuOk = $productOk && ($skuSync['ok'] ?? false);

        $imageSync = null;
        if ($productOk) {
            $imageSync = $this->syncProductImages($product, (string) $joorProductId, $query);
            if (! ($imageSync['ok'] ?? false) && ! ($imageSync['skipped'] ?? false)) {
                $hasErrors = true;
            }
        }

        // Runs off $skuOk (not the combined error flag) so a broken product image doesn't
        // stop the color swatch from being uploaded — the two syncs are otherwise unrelated.
        $swatchSync = null;
        if ($skuOk) {
            $swatchSync = $this->syncColorSwatches($product, (string) $joorProductId, $query);
            if (! ($swatchSync['ok'] ?? false) && ! ($swatchSync['skipped'] ?? false)) {
                $hasErrors = true;
            }
        }

        return [
            'status' => $response->status(),
            'body' => $body,
            'ok' => $response->successful() && ! $hasErrors,
            'sku_sync' => $skuSync,
            'image_sync' => $imageSync,
            'swatch_sync' => $swatchSync,
            'request' => [
                'url' => $this->apiUrl($endpoint),
                'query' => $query,
                'payload' => $payload,
            ],
        ];
    }

    /**
     * GET /orders — fetch a filtered list of orders from JOOR.
     */
    public function getOrders(array $filters = []): array
    {
        $query = $this->resolveBaseQuery();

        foreach (['order_ids', 'status', 'date_approved_start', 'date_approved_end', 'export_status', 'last_modified', 'page', 'page_size', 'sort_by', 'sort_order'] as $key) {
            if (isset($filters[$key]) && $filters[$key] !== '' && $filters[$key] !== null) {
                $query[$key] = $filters[$key];
            }
        }

        $response = $this->request()->get($this->apiUrl('/orders') . '?' . http_build_query($query));
        $body = $response->json() ?? ['raw' => $response->body()];
        $hasErrors = is_array($body) && is_array($body['errors'] ?? null) && count($body['errors']) > 0;

        return [
            'status' => $response->status(),
            'body' => $body,
            'ok' => $response->successful() && ! $hasErrors,
            'request' => [
                'url' => $this->apiUrl('/orders'),
                'query' => $query,
            ],
        ];
    }

    /**
     * POST /orders/bulk_create — create a single order in JOOR.
     */
    public function createOrder(array $order): array
    {
        $query = $this->resolveBaseQuery();
        $payload = [$order];

        $response = $this->request()->post($this->apiUrl('/orders/bulk_create') . '?' . http_build_query($query), $payload);
        $body = $response->json() ?? ['raw' => $response->body()];
        $hasErrors = is_array($body) && is_array($body['errors'] ?? null) && count($body['errors']) > 0;

        return [
            'status' => $response->status(),
            'body' => $body,
            'ok' => $response->successful() && ! $hasErrors,
            'request' => [
                'url' => $this->apiUrl('/orders/bulk_create'),
                'query' => $query,
                'payload' => $payload,
            ],
        ];
    }

    /**
     * POST /orders/bulk_update — update a single order in JOOR. $order must include 'id'.
     */
    public function updateOrder(array $order): array
    {
        $query = $this->resolveBaseQuery();
        $payload = [$order];

        $response = $this->request()->post($this->apiUrl('/orders/bulk_update') . '?' . http_build_query($query), $payload);
        $body = $response->json() ?? ['raw' => $response->body()];
        $hasErrors = is_array($body) && is_array($body['errors'] ?? null) && count($body['errors']) > 0;

        return [
            'status' => $response->status(),
            'body' => $body,
            'ok' => $response->successful() && ! $hasErrors,
            'request' => [
                'url' => $this->apiUrl('/orders/bulk_update'),
                'query' => $query,
                'payload' => $payload,
            ],
        ];
    }

    /**
     * GET /orders/sku_line_items — fetch the product/color/size line items for a
     * single order. Unlike GET /orders, this endpoint returns per-SKU rows.
     */
    public function getOrderItems(string $orderId): array
    {
        $query = $this->resolveBaseQuery();
        $query['order_ids'] = $orderId;
        $url = $this->apiUrl('/orders/sku_line_items');

        $response = $this->request()->get($url . '?' . http_build_query($query));
        $body = $response->json() ?? ['raw' => $response->body()];
        $hasErrors = is_array($body) && is_array($body['errors'] ?? null) && count($body['errors']) > 0;

        return [
            'status' => $response->status(),
            'body' => $body,
            'ok' => $response->successful() && ! $hasErrors,
            'request' => [
                'url' => $url,
                'query' => $query,
            ],
        ];
    }

    private function resolveBaseQuery(): array
    {
        $accountId = trim((string) $this->config('joor_id', ''));
        if ($accountId === '') {
            throw new RuntimeException('JOOR account ID is required (JOOR_ID).');
        }

        $query = ['account' => $accountId];

        $userId = trim((string) $this->config('user_id', ''));
        if ($userId !== '') {
            $query['user_id'] = $userId;
        }

        return $query;
    }

    private function syncProductImages(Product $product, string $joorProductId, array $query): array
    {
        $imageUrls = $this->resolveProductImageUrls($product);

        if ($imageUrls === []) {
            return [
                'ok' => false,
                'skipped' => true,
                'reason' => 'Product has no images to sync to JOOR.',
            ];
        }

        $payload = [];
        foreach (array_values($imageUrls) as $index => $url) {
            $extension = strtolower((string) pathinfo(parse_url($url, PHP_URL_PATH) ?: $url, PATHINFO_EXTENSION));

            // JOOR /assets/products only accepts these image extensions.
            if (! in_array($extension, ['gif', 'jpeg', 'jpg', 'png'], true)) {
                continue;
            }

            $payload[] = [
                'product' => ['id' => $joorProductId],
                'asset' => [
                    'type' => 'image',
                    'filename' => $this->buildAssetFilename((string) $product->sku, $index, $extension),
                    'source_url' => $url,
                ],
                'display_order' => $index,
            ];
        }

        if ($payload === []) {
            return [
                'ok' => false,
                'skipped' => true,
                'reason' => 'No product images with a supported extension (gif, jpeg, jpg, png) to sync to JOOR.',
            ];
        }

        // replace_all clears previously synced images so re-syncing reflects the current image set.
        $assetsQuery = array_merge($query, ['replace_all' => 'true']);
        $response = $this->request()->post($this->apiUrl('/assets/products') . '?' . http_build_query($assetsQuery), $payload);
        $body = $response->json() ?? ['raw' => $response->body()];
        $hasErrors = is_array($body) && is_array($body['errors'] ?? null) && count($body['errors']) > 0;

        return [
            'status' => $response->status(),
            'body' => $body,
            'ok' => $response->successful() && ! $hasErrors,
            'request' => [
                'url' => $this->apiUrl('/assets/products'),
                'query' => $assetsQuery,
                'payload' => $payload,
            ],
        ];
    }

    /**
     * POST /assets/sku_trait_values/ — uploads a color image so JOOR fills in the color box
     * instead of leaving it blank for names it doesn't recognize. Prefers a curated image at
     * public/color/{color-name}.{ext} and falls back to a generated solid-fill swatch.
     */
    private function syncColorSwatches(Product $product, string $joorProductId, array $query): array
    {
        $colors = $this->resolveProductColors($product);

        $payload = [];
        foreach ($colors as $color => $colorHex) {
            $swatch = $this->resolveColorImageAsset($color, $colorHex);
            if ($swatch === null) {
                continue;
            }

            $colorCode = $this->buildColorCode($color, $colorHex);

            $payload[] = [
                'product' => ['id' => $joorProductId],
                'sku_trait_value' => [
                    'trait' => ['name' => 'color'],
                    'value' => ['external_id' => $colorCode],
                ],
                // asset.external_id is omitted: JOOR requires it to be globally unique across
                // the account, which breaks on every re-sync of the same product/color.
                'asset' => [
                    'type' => 'swatch',
                    'filename' => $colorCode . '.' . $swatch['extension'],
                    'source_url' => $swatch['url'],
                ],
            ];
        }

        if ($payload === []) {
            return [
                'ok' => false,
                'skipped' => true,
                'reason' => 'Product has no colors with a swatch image (curated or hex-generated) to sync to JOOR.',
            ];
        }

        $response = $this->request()->post($this->apiUrl('/assets/sku_trait_values/') . '?' . http_build_query($query), $payload);
        $body = $response->json() ?? ['raw' => $response->body()];
        $hasErrors = is_array($body) && is_array($body['errors'] ?? null) && count($body['errors']) > 0;

        return [
            'status' => $response->status(),
            'body' => $body,
            'ok' => $response->successful() && ! $hasErrors,
            'request' => [
                'url' => $this->apiUrl('/assets/sku_trait_values/'),
                'query' => $query,
                'payload' => $payload,
            ],
        ];
    }

    /**
     * Returns ['url' => ..., 'extension' => ...] for the color's swatch image, preferring a
     * curated file at public/color/{color-name}.{ext} (e.g. public/color/black.jpg) over the
     * generated solid-fill fallback so brand-provided swatch art is used when available.
     */
    private function resolveColorImageAsset(string $color, ?string $colorHex): ?array
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', trim($color)) ?? trim($color), '-'));

        if ($slug !== '') {
            foreach (['jpg', 'jpeg', 'png', 'gif'] as $extension) {
                $relativePath = 'color/' . $slug . '.' . $extension;
                if (is_file(public_path($relativePath))) {
                    return [
                        'url' => $this->resolveAbsoluteMediaUrl($relativePath),
                        'extension' => $extension,
                    ];
                }
            }
        }

        if ($colorHex === null || $colorHex === '') {
            return null;
        }

        $generatedUrl = $this->resolveColorSwatchImageUrl($colorHex);
        if ($generatedUrl === null) {
            return null;
        }

        return ['url' => $generatedUrl, 'extension' => 'png'];
    }

    // Generates (and caches on disk) a small solid-fill PNG for the given hex code, so JOOR has
    // an image to use as the color swatch. Returns null when the GD extension is unavailable.
    private function resolveColorSwatchImageUrl(string $hex): ?string
    {
        $normalizedHex = ltrim(trim($hex), '#');
        if (preg_match('/^[0-9A-Fa-f]{6}$/', $normalizedHex) !== 1) {
            return null;
        }

        if (! function_exists('imagecreatetruecolor')) {
            return null;
        }

        $relativePath = 'uploads/joor-swatches/' . strtoupper($normalizedHex) . '.png';
        $absolutePath = public_path($relativePath);

        if (! is_file($absolutePath)) {
            $targetDirectory = dirname($absolutePath);
            if (! is_dir($targetDirectory)) {
                mkdir($targetDirectory, 0755, true);
            }

            $red = (int) hexdec(substr($normalizedHex, 0, 2));
            $green = (int) hexdec(substr($normalizedHex, 2, 2));
            $blue = (int) hexdec(substr($normalizedHex, 4, 2));

            $image = imagecreatetruecolor(100, 100);
            $fill = imagecolorallocate($image, $red, $green, $blue);
            imagefilledrectangle($image, 0, 0, 100, 100, $fill);
            $saved = imagepng($image, $absolutePath);
            imagedestroy($image);

            if (! $saved) {
                return null;
            }
        }

        return $this->resolveAbsoluteMediaUrl($relativePath);
    }

    private function resolveProductImageUrls(Product $product): array
    {
        $paths = [];

        if (is_string($product->cover_image) && trim($product->cover_image) !== '') {
            $paths[] = $product->cover_image;
        }

        $gallery = $product->image_gallery;
        if (is_array($gallery)) {
            foreach ($gallery as $path) {
                if (is_string($path) && trim($path) !== '') {
                    $paths[] = $path;
                }
            }
        }

        $urls = [];
        foreach (array_unique($paths) as $path) {
            // The uploader saves large images as WebP, which JOOR's assets endpoint rejects,
            // so convert those to a JPEG copy before building the URL JOOR will fetch.
            $compatiblePath = $this->resolveJoorCompatibleImagePath($path);
            if ($compatiblePath === null) {
                continue;
            }

            $url = $this->resolveAbsoluteMediaUrl($compatiblePath);
            if ($url !== null) {
                $urls[] = $url;
            }
        }

        return array_values(array_unique($urls));
    }

    /**
     * Returns a locally-stored path using an extension JOOR's assets endpoint accepts
     * (gif, jpeg, jpg, png), converting WebP files to JPEG on demand. Returns null when the
     * path is remote/unreadable or its format can't be converted.
     */
    private function resolveJoorCompatibleImagePath(string $path): ?string
    {
        $extension = strtolower((string) pathinfo(parse_url($path, PHP_URL_PATH) ?: $path, PATHINFO_EXTENSION));

        if (in_array($extension, ['gif', 'jpeg', 'jpg', 'png'], true)) {
            return $path;
        }

        if ($extension !== 'webp' || str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return null;
        }

        if (! function_exists('imagecreatefromwebp')) {
            return null;
        }

        $sourceAbsolutePath = public_path(ltrim($path, '/'));
        if (! is_file($sourceAbsolutePath)) {
            return null;
        }

        $convertedRelativePath = preg_replace('/\.webp$/i', '', $path) . '.joor.jpg';
        $convertedAbsolutePath = public_path(ltrim($convertedRelativePath, '/'));

        if (! is_file($convertedAbsolutePath) || filemtime($convertedAbsolutePath) < filemtime($sourceAbsolutePath)) {
            $image = @imagecreatefromwebp($sourceAbsolutePath);
            if ($image === false) {
                return null;
            }

            $targetDirectory = dirname($convertedAbsolutePath);
            if (! is_dir($targetDirectory)) {
                mkdir($targetDirectory, 0755, true);
            }

            $saved = imagejpeg($image, $convertedAbsolutePath, 90);
            imagedestroy($image);

            if (! $saved) {
                return null;
            }
        }

        return $convertedRelativePath;
    }

    private function resolveAbsoluteMediaUrl(mixed $path): ?string
    {
        $trimmed = trim((string) $path);
        if ($trimmed === '') {
            return null;
        }

        if (str_starts_with($trimmed, 'http://') || str_starts_with($trimmed, 'https://')) {
            return $trimmed;
        }

        return rtrim($this->resolvePublicBaseUrl(), '/') . '/' . ltrim($trimmed, '/');
    }

    /**
     * Prefers the host of the current inbound request over APP_URL so image URLs sent to JOOR
     * reflect the real public domain even when APP_URL in .env is stale (e.g. left as localhost).
     */
    private function resolvePublicBaseUrl(): string
    {
        if (app()->bound('request')) {
            $host = rtrim((string) app('request')->getSchemeAndHttpHost(), '/');
            if ($host !== '' && ! str_contains($host, 'localhost') && ! str_contains($host, '127.0.0.1')) {
                return $host;
            }
        }

        return (string) config('app.url');
    }

    private function buildAssetFilename(string $sku, int $index, string $extension): string
    {
        $base = trim((string) preg_replace('/[^A-Za-z0-9]+/', '-', strtoupper(trim($sku))), '-');
        if ($base === '') {
            $base = 'ASSET';
        }

        // JOOR requires a unique filename no longer than 100 characters.
        $suffix = '-' . ($index + 1) . '.' . $extension;
        $base = substr($base, 0, max(1, 100 - strlen($suffix)));

        return $base . $suffix;
    }

    protected function request(): PendingRequest
    {
        $request = Http::acceptJson()
            ->asJson()
            ->timeout((int) $this->config('timeout', 30));

        if (! (bool) $this->config('verify_ssl', true)) {
            $request = $request->withOptions(['verify' => false]);
        }

        $token = $this->resolveAccessToken();

        if (str_starts_with(strtolower($token), 'bearer ')) {
            return $request->withHeaders([
                'Authorization' => $token,
            ]);
        }

        return $request->withToken($token);
    }

    protected function resolveAccessToken(): string
    {
        if ($this->hasAuthCredentials()) {
            return $this->authenticate()['access_token'] ?? throw new RuntimeException('JOOR auth response missing access_token.');
        }

        $staticToken = trim((string) $this->config('token', ''));
        if ($staticToken !== '') {
            return $staticToken;
        }

        throw new RuntimeException('JOOR token is missing. Configure JOOR credentials or JOOR_API_TOKEN.');
    }

    private function hasAuthCredentials(): bool
    {
        return trim((string) $this->config('client_id', '')) !== ''
            && trim((string) $this->config('client_secret', '')) !== ''
            && trim((string) $this->config('username', '')) !== ''
            && trim((string) $this->config('password', '')) !== '';
    }

    protected function authenticate(): array
    {
        $clientId = trim((string) $this->config('client_id', ''));
        $clientSecret = trim((string) $this->config('client_secret', ''));
        $username = trim((string) $this->config('username', ''));
        $password = trim((string) $this->config('password', ''));

        if ($clientId === '' || $clientSecret === '' || $username === '' || $password === '') {
            throw new RuntimeException('JOOR credentials are not configured. Set JOOR_CLIENT_ID, JOOR_CLIENT_SECRET, JOOR_USERNAME, and JOOR_PASSWORD.');
        }

        $authUrl = $this->authUrl($this->config('auth_endpoint', '/auth/'));

        $request = Http::acceptJson()
            ->asForm()
            ->timeout((int) $this->config('timeout', 30));

        if (! (bool) $this->config('verify_ssl', true)) {
            $request = $request->withOptions(['verify' => false]);
        }

        try {
            $response = $request->post($authUrl, [
                'client_id' => $clientId,
                'grant_type' => 'password',
                'client_secret' => $clientSecret,
                'username' => $username,
                'password' => $password,
            ]);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('JOOR auth connection failed: ' . $exception->getMessage(), previous: $exception);
        }

        if ($response->failed()) {
            throw new RuntimeException('JOOR auth failed: ' . $response->status() . ' ' . $response->body());
        }

        return $response->json() ?? [];
    }

    protected function buildProductPayload(Product $product, array $query): array
    {
        $payload = [
            'name' => $product->name,
            'external_id' => (string) $product->sku,
            'product_identifier' => (string) $product->sku,
            'description' => $this->buildProductDescription($product),
            'order_minimum' => 0,
        ];

        // JOOR's /products/bulk_create endpoint rejects these fields even though they are
        // useful in our local product model. Keep the payload to the schema the API accepts.
        $categoryIds = $this->resolveProductCategoryIds($product, $query);
        if ($categoryIds !== []) {
            $payload['category_ids'] = $categoryIds;
        }

        return $payload;
    }

    // JOOR's product schema only accepts a single 'description' field, so fold the fabric &
    // care and composition content into it as clearly labeled sections instead of dropping it.
    private function buildProductDescription(Product $product): ?string
    {
        $sections = [$this->htmlToPlainText($product->description)];

        $fabricAndCare = $this->htmlToPlainText($product->fabric_and_care);
        if ($fabricAndCare !== '') {
            $sections[] = "Fabric & Care:\n" . $fabricAndCare;
        }

        $composition = $this->htmlToPlainText($product->product_composition);
        if ($composition !== '') {
            $sections[] = "Product Composition:\n" . $composition;
        }

        $sections = array_values(array_filter($sections, static fn (string $section): bool => $section !== ''));

        return $sections === [] ? null : implode("\n\n", $sections);
    }

    private function htmlToPlainText(?string $html): string
    {
        if ($html === null || trim($html) === '') {
            return '';
        }

        $text = preg_replace('/<[^>]+>/', ' ', $html) ?? $html;
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5);

        return trim(preg_replace('/\s+/', ' ', $text) ?? $text);
    }

    private function syncSkusForProduct(Product $product, string $joorProductId, array $query): array
    {
        $skuPayload = $this->buildSkuPayload($product, $joorProductId);

        if ($skuPayload === []) {
            return [
                'ok' => false,
                'skipped' => true,
                'reason' => 'Color and Size values are required for JOOR SKU sync.',
                'request' => [
                    'url' => $this->apiUrl('/skus/bulk_create'),
                    'query' => $query,
                    'payload' => [],
                ],
            ];
        }

        $response = $this->request()->post($this->apiUrl('/skus/bulk_create') . '?' . http_build_query($query), $skuPayload);
        $body = $response->json() ?? ['raw' => $response->body()];
        $hasErrors = is_array($body) && is_array($body['errors'] ?? null) && count($body['errors']) > 0;
        $ok = $response->successful() && ! $hasErrors;

        $priceSync = null;
        if ($ok) {
            $skuIds = collect(data_get($body, 'data', []))
                ->pluck('id')
                ->filter(static fn ($id): bool => is_scalar($id) && (string) $id !== '')
                ->map(static fn ($id): string => (string) $id)
                ->values()
                ->all();

            if ($skuIds !== []) {
                $priceSync = $this->syncSkuPrices($product, $skuIds, $query);
                if (! ($priceSync['ok'] ?? false)) {
                    $ok = false;
                }
            }
        }

        return [
            'status' => $response->status(),
            'body' => $body,
            'ok' => $ok,
            'price_sync' => $priceSync,
            'request' => [
                'url' => $this->apiUrl('/skus/bulk_create'),
                'query' => $query,
                'payload' => $skuPayload,
            ],
        ];
    }

    private function syncSkuPrices(Product $product, array $skuIds, array $query): array
    {
        $price = $this->resolveProductPrice($product);
        if ($price === null) {
            return [
                'ok' => false,
                'skipped' => true,
                'reason' => 'Product has no numeric price to sync to JOOR.',
            ];
        }

        $priceTypeId = $this->fetchJoorPriceTypeId($query);
        if ($priceTypeId === null) {
            return [
                'ok' => false,
                'skipped' => true,
                'reason' => 'No JOOR price type is configured for this account.',
            ];
        }

        $priceValue = number_format($price, 2, '.', '');

        // JOOR's /prices/bulk_create requires wholesale_value/retail_value as strings alongside price_type_id.
        $payload = array_map(static fn (string $skuId): array => [
            'sku_id' => $skuId,
            'wholesale_value' => $priceValue,
            'retail_value' => $priceValue,
            'price_type_id' => $priceTypeId,
        ], $skuIds);

        $response = $this->request()->post($this->apiUrl('/prices/bulk_create') . '?' . http_build_query($query), $payload);
        $body = $response->json() ?? ['raw' => $response->body()];
        $errors = is_array($body) && is_array($body['errors'] ?? null) ? $body['errors'] : [];

        // A price already exists for this SKU/price-type when re-syncing an existing product; update it instead.
        $duplicatedSkuIds = $this->extractDuplicatedPriceSkuIds($errors);
        $updateResult = $duplicatedSkuIds !== []
            ? $this->updateExistingSkuPrices($duplicatedSkuIds, $priceValue, $query)
            : null;

        $blockingErrors = array_values(array_filter(
            $errors,
            static fn ($error): bool => ! is_array($error) || strtoupper((string) ($error['status'] ?? '')) !== 'DUPLICATED',
        ));

        $ok = $response->successful()
            && $blockingErrors === []
            && ($updateResult === null || ($updateResult['ok'] ?? false));

        return [
            'status' => $response->status(),
            'body' => $body,
            'ok' => $ok,
            'update' => $updateResult,
            'request' => [
                'url' => $this->apiUrl('/prices/bulk_create'),
                'query' => $query,
                'payload' => $payload,
            ],
        ];
    }

    private function extractDuplicatedPriceSkuIds(array $errors): array
    {
        $skuIds = [];

        foreach ($errors as $error) {
            if (! is_array($error) || strtoupper((string) ($error['status'] ?? '')) !== 'DUPLICATED') {
                continue;
            }

            $skuId = data_get($error, 'details.sku_id');
            if (is_scalar($skuId) && (string) $skuId !== '') {
                $skuIds[] = (string) $skuId;
            }
        }

        return array_values(array_unique($skuIds));
    }

    private function updateExistingSkuPrices(array $skuIds, string $priceValue, array $query): array
    {
        $priceIds = [];

        foreach ($skuIds as $skuId) {
            $lookupUrl = $this->apiUrl('/prices') . '?' . http_build_query(array_merge($query, ['sku_ids' => $skuId]));
            $lookupResponse = $this->request()->get($lookupUrl);
            $priceId = data_get($lookupResponse->json(), 'data.0.id');

            if (is_scalar($priceId) && (string) $priceId !== '') {
                $priceIds[] = (string) $priceId;
            }
        }

        if ($priceIds === []) {
            return [
                'ok' => false,
                'skipped' => true,
                'reason' => 'Could not resolve existing JOOR price IDs to update.',
            ];
        }

        $payload = array_map(static fn (string $priceId): array => [
            'id' => $priceId,
            'wholesale_value' => $priceValue,
            'retail_value' => $priceValue,
        ], $priceIds);

        $response = $this->request()->post($this->apiUrl('/prices/bulk_update') . '?' . http_build_query($query), $payload);
        $body = $response->json() ?? ['raw' => $response->body()];
        $hasErrors = is_array($body) && is_array($body['errors'] ?? null) && count($body['errors']) > 0;

        return [
            'status' => $response->status(),
            'body' => $body,
            'ok' => $response->successful() && ! $hasErrors,
            'request' => [
                'url' => $this->apiUrl('/prices/bulk_update'),
                'query' => $query,
                'payload' => $payload,
            ],
        ];
    }

    private function fetchJoorPriceTypeId(array $query): ?string
    {
        $configuredId = trim((string) $this->config('price_type_id', ''));
        if ($configuredId !== '') {
            return $configuredId;
        }

        $response = $this->request()->get($this->apiUrl('/price_types') . '?' . http_build_query($query));
        $body = $response->json() ?? [];
        $priceTypeId = data_get($body, 'data.0.id');

        return is_scalar($priceTypeId) && (string) $priceTypeId !== '' ? (string) $priceTypeId : null;
    }

    protected function buildSkuPayload(Product $product, string $joorProductId): array
    {
        $colors = $this->resolveProductColors($product);
        $sizes = $this->resolveProductSizes($product);

        if ($sizes === []) {
            $defaultSize = trim((string) $this->config('default_sku_size', ''));
            if ($defaultSize !== '') {
                $sizes = [$defaultSize];
            }
        }

        if ($colors === [] || $sizes === []) {
            return [];
        }

        $colorTraitId = (string) $this->config('sku_color_trait_id', 'U0tVVHJhaXQ6U3R5bGVDb2xvcg==');
        $sizeTraitId = (string) $this->config('sku_size_trait_id', 'U0tVVHJhaXQ6U2l6ZQ==');

        $payload = [];

        foreach ($colors as $color => $colorHex) {
            $colorCode = $this->buildColorCode($color, $colorHex);

            foreach ($sizes as $size) {
                $externalId = $this->buildSkuExternalId((string) $product->sku, $color, $size);

                $payload[] = [
                    'product_id' => $joorProductId,
                    'external_id' => $externalId,
                    'sku_identifier' => $externalId,
                    'trait_values' => [
                        [
                            'trait_id' => $colorTraitId,
                            'value' => $color,
                            // JOOR requires a Color Code per trait value; this also doubles as the
                            // lookup key when uploading the color's swatch asset below.
                            'external_id' => $colorCode,
                        ],
                        [
                            'trait_id' => $sizeTraitId,
                            'value' => $size,
                            'external_id' => $this->buildSizeCode($size),
                        ],
                    ],
                ];
            }
        }

        return $payload;
    }

    // Uses the color's hex (without '#') as its JOOR Color Code so it stays stable and unique;
    // falls back to a slug of the name when no hex is on file.
    private function buildColorCode(string $color, ?string $hex): string
    {
        $normalizedHex = $hex !== null ? ltrim(trim($hex), '#') : '';
        if ($normalizedHex !== '' && preg_match('/^[0-9A-Fa-f]{6}$/', $normalizedHex) === 1) {
            return strtoupper($normalizedHex);
        }

        $slug = strtoupper(preg_replace('/[^A-Za-z0-9]+/', '-', trim($color)) ?? trim($color));

        return substr(trim($slug, '-'), 0, 100);
    }

    private function buildSizeCode(string $size): string
    {
        $slug = strtoupper(preg_replace('/[^A-Za-z0-9]+/', '-', trim($size)) ?? trim($size));

        return substr(trim($slug, '-'), 0, 25);
    }

    private function resolveProductPrice(Product $product): ?float
    {
        $raw = $product->price;

        return is_numeric($raw) ? (float) $raw : null;
    }

    private function buildSkuExternalId(string $sku, string $color, string $size): string
    {
        $parts = [
            strtoupper(trim($sku)),
            strtoupper(preg_replace('/[^A-Za-z0-9]+/', '-', trim($color)) ?? trim($color)),
            strtoupper(preg_replace('/[^A-Za-z0-9]+/', '-', trim($size)) ?? trim($size)),
        ];

        return implode('-', array_values(array_filter($parts, static fn (string $part): bool => $part !== '')));
    }

    private function resolveProductCategoryIds(Product $product, array $query): array
    {
        $categoryCandidates = $this->resolveProductCategoryCandidates($product);
        if ($categoryCandidates === []) {
            return [];
        }

        $joorCategories = $this->fetchJoorCategories($query);
        if ($joorCategories === []) {
            return [];
        }

        $departmentHint = $this->resolveProductDepartmentHint($product);
        $matchedIds = $this->findJoorCategoryIds($categoryCandidates, $joorCategories, $departmentHint);

        if ($matchedIds !== []) {
            return $matchedIds;
        }

        $mappedCategoryIds = $this->mapCategoryCandidatesFromConfig($categoryCandidates);
        return $mappedCategoryIds;
    }

    private function resolveProductCategoryCandidates(Product $product): array
    {
        $candidates = [];

        if (is_numeric($product->grand_child_id)) {
            $grandChildName = GrandChilds::query()->whereKey((int) $product->grand_child_id)->value('name');
            if (is_string($grandChildName) && trim($grandChildName) !== '') {
                $candidates[] = trim($grandChildName);
            }
        }

        if (is_numeric($product->subcategory_id)) {
            $subCategoryName = SubCategory::query()->whereKey((int) $product->subcategory_id)->value('name');
            if (is_string($subCategoryName) && trim($subCategoryName) !== '') {
                $candidates[] = trim($subCategoryName);
            }
        }

        if (is_numeric($product->category_id)) {
            $categoryName = Category::query()->whereKey((int) $product->category_id)->value('name');
            if (is_string($categoryName) && trim($categoryName) !== '') {
                $candidates[] = trim($categoryName);
            }
        }

        return array_values(array_unique($candidates));
    }

    private function resolveProductDepartmentHint(Product $product): ?string
    {
        $candidates = [];

        if (is_numeric($product->grand_child_id)) {
            $candidates[] = GrandChilds::query()->whereKey((int) $product->grand_child_id)->value('name');
        }

        if (is_numeric($product->subcategory_id)) {
            $candidates[] = SubCategory::query()->whereKey((int) $product->subcategory_id)->value('name');
        }

        if (is_numeric($product->category_id)) {
            $candidates[] = Category::query()->whereKey((int) $product->category_id)->value('name');
        }

        foreach ($candidates as $candidate) {
            if (! is_string($candidate)) {
                continue;
            }

            $normalized = strtolower(trim($candidate));

            if (str_contains($normalized, 'women')) {
                return 'WOMEN';
            }

            if (str_contains($normalized, 'men')) {
                return 'MEN';
            }

            if (str_contains($normalized, 'girls')) {
                return 'GIRLS';
            }

            if (str_contains($normalized, 'boys')) {
                return 'BOYS';
            }

            if (str_contains($normalized, 'unisex')) {
                return 'UNISEX';
            }

            if (str_contains($normalized, 'baby girl')) {
                return 'BABY_GIRLS';
            }

            if (str_contains($normalized, 'baby boy')) {
                return 'BABY_BOYS';
            }
        }

        return null;
    }

    private function findJoorCategoryIds(array $categoryCandidates, array $joorCategories, ?string $departmentHint): array
    {
        $matchedIds = [];

        foreach ($categoryCandidates as $candidate) {
            $normalizedCandidate = $this->normalizeLookupKey($candidate);
            $exactMatches = [];

            foreach ($joorCategories as $joorCategory) {
                if (! is_array($joorCategory)) {
                    continue;
                }

                $joorName = trim((string) ($joorCategory['name'] ?? ''));
                if ($joorName === '' || $this->normalizeLookupKey($joorName) !== $normalizedCandidate) {
                    continue;
                }

                $joorCategoryId = (string) ($joorCategory['id'] ?? '');
                if ($joorCategoryId === '') {
                    continue;
                }

                $exactMatches[] = $joorCategory;
            }

            if ($exactMatches === []) {
                continue;
            }

            if ($departmentHint !== null) {
                foreach ($exactMatches as $match) {
                    if (strtoupper((string) ($match['department'] ?? '')) === $departmentHint) {
                        return [(string) $match['id']];
                    }
                }
            }

            $firstMatch = $exactMatches[0] ?? null;
            if (is_array($firstMatch) && is_string($firstMatch['id'] ?? null) && trim((string) $firstMatch['id']) !== '') {
                $matchedIds[] = (string) $firstMatch['id'];
                break;
            }
        }

        return array_values(array_unique($matchedIds));
    }

    private function fetchJoorCategories(array $query): array
    {
        if ($this->joorCategoriesCache !== null) {
            return $this->joorCategoriesCache;
        }

        $response = $this->request()->get($this->apiUrl('/categories') . '?' . http_build_query($query));
        $body = $response->json() ?? [];

        $this->joorCategoriesCache = is_array($body['data'] ?? null)
            ? $body['data']
            : [];

        return $this->joorCategoriesCache;
    }

    private function normalizeLookupKey(string $value): string
    {
        return strtolower(trim(preg_replace('/\s+/', ' ', $value) ?? $value));
    }

    private function mapCategoryCandidatesFromConfig(array $categoryCandidates): array
    {
        $rawMap = trim((string) $this->config('category_name_map', ''));
        if ($rawMap === '') {
            return [];
        }

        $parsedMap = [];

        foreach (explode(',', $rawMap) as $entry) {
            $parts = explode(':', $entry, 2);
            $name = trim((string) ($parts[0] ?? ''));
            $id = trim((string) ($parts[1] ?? ''));

            if ($name === '' || ! is_numeric($id)) {
                continue;
            }

            $parsedMap[$this->normalizeLookupKey($name)] = (string) $id;
        }

        if ($parsedMap === []) {
            return [];
        }

        $ids = [];

        foreach ($categoryCandidates as $candidate) {
            $normalizedCandidate = $this->normalizeLookupKey($candidate);
            if (isset($parsedMap[$normalizedCandidate])) {
                $ids[] = $parsedMap[$normalizedCandidate];
            }
        }

        return array_values(array_unique($ids));
    }

    private function hasDuplicatedProductError(mixed $body): bool
    {
        if (! is_array($body) || ! is_array($body['errors'] ?? null)) {
            return false;
        }

        foreach ($body['errors'] as $error) {
            if (! is_array($error)) {
                continue;
            }

            if (strtoupper((string) ($error['status'] ?? '')) === 'DUPLICATED') {
                return true;
            }
        }

        return false;
    }

    private function resolveProductSizes(Product $product): array
    {
        $rawSize = $product->getRawOriginal('size');
        $sizeTokens = $this->extractTokens($rawSize);

        if ($sizeTokens === []) {
            return [];
        }

        $numericSizeIds = array_values(array_filter($sizeTokens, static fn (string $token): bool => ctype_digit($token)));
        if ($numericSizeIds !== []) {
            $sizeNames = Size::query()
                ->whereIn('id', $numericSizeIds)
                ->pluck('size')
                ->filter(static fn ($name): bool => is_string($name) && trim($name) !== '')
                ->map(static fn (string $name): string => trim($name))
                ->values()
                ->all();

            if ($sizeNames !== []) {
                return array_values(array_unique($sizeNames));
            }
        }

        return array_values(array_unique($sizeTokens));
    }

    /**
     * Returns color name => hex code (nullable) pairs for the product. The hex is used to
     * build the SKU trait's Color Code and to generate the swatch JOOR displays for it.
     */
    private function resolveProductColors(Product $product): array
    {
        $rawColor = $product->getRawOriginal('color');
        $colorTokens = $this->extractTokens($rawColor);

        if ($colorTokens === []) {
            return [];
        }

        $numericColorIds = array_values(array_filter($colorTokens, static fn (string $token): bool => ctype_digit($token)));
        if ($numericColorIds !== []) {
            $colors = Color::query()
                ->whereIn('id', $numericColorIds)
                ->get(['name', 'color_code'])
                ->filter(static fn (Color $color): bool => trim((string) $color->name) !== '');

            if ($colors->isNotEmpty()) {
                $result = [];
                foreach ($colors as $color) {
                    $name = trim((string) $color->name);
                    $hex = trim((string) $color->color_code);
                    $result[$name] = $hex !== '' ? $hex : null;
                }

                return $result;
            }
        }

        $result = [];
        foreach (array_unique($colorTokens) as $token) {
            $result[$token] = null;
        }

        return $result;
    }

    private function extractTokens(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter(array_map(static fn ($item): string => trim(trim((string) $item), "\"'"), $value), static fn (string $item): bool => $item !== ''));
        }

        if (! is_string($value)) {
            return [];
        }

        $trimmed = trim($value);
        if ($trimmed === '') {
            return [];
        }

        $decoded = json_decode($trimmed, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return array_values(array_filter(array_map(static fn ($item): string => trim(trim((string) $item), "\"'"), $decoded), static fn (string $item): bool => $item !== ''));
        }

        return array_values(array_filter(array_map(static fn (string $part): string => trim(trim($part), "\"'"), explode(',', $trimmed)), static fn (string $part): bool => $part !== ''));
    }

    protected function authUrl(string $path): string
    {
        return rtrim((string) $this->config('auth_base_url', 'https://atlas-sandbox.jooraccess.com'), '/')
            . '/'
            . ltrim($path, '/');
    }

    protected function apiUrl(string $path): string
    {
        return rtrim((string) $this->config('api_base_url', 'https://apisandbox.jooraccess.com/v4'), '/')
            . '/'
            . ltrim($path, '/');
    }

    protected function config(string $key, mixed $default = null): mixed
    {
        return config('services.joor.' . $key, $default);
    }
}
