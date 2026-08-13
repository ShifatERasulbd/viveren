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

        if (! $hasErrors && is_scalar($joorProductId)) {
            $skuSync = $this->syncSkusForProduct($product, (string) $joorProductId, $query);
            if (! ($skuSync['ok'] ?? false)) {
                $hasErrors = true;
            }
        }

        return [
            'status' => $response->status(),
            'body' => $body,
            'ok' => $response->successful() && ! $hasErrors,
            'sku_sync' => $skuSync,
            'request' => [
                'url' => $this->apiUrl($endpoint),
                'query' => $query,
                'payload' => $payload,
            ],
        ];
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
            'description' => $product->description,
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

        return [
            'status' => $response->status(),
            'body' => $body,
            'ok' => $response->successful() && ! $hasErrors,
            'request' => [
                'url' => $this->apiUrl('/skus/bulk_create'),
                'query' => $query,
                'payload' => $skuPayload,
            ],
        ];
    }

    private function buildSkuPayload(Product $product, string $joorProductId): array
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

        foreach ($colors as $color) {
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
                        ],
                        [
                            'trait_id' => $sizeTraitId,
                            'value' => $size,
                        ],
                    ],
                ];
            }
        }

        return $payload;
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

    private function resolveProductColors(Product $product): array
    {
        $rawColor = $product->getRawOriginal('color');
        $colorTokens = $this->extractTokens($rawColor);

        if ($colorTokens === []) {
            return [];
        }

        $numericColorIds = array_values(array_filter($colorTokens, static fn (string $token): bool => ctype_digit($token)));
        if ($numericColorIds !== []) {
            $colorNames = Color::query()
                ->whereIn('id', $numericColorIds)
                ->pluck('name')
                ->filter(static fn ($name): bool => is_string($name) && trim($name) !== '')
                ->map(static fn (string $name): string => trim($name))
                ->values()
                ->all();

            if ($colorNames !== []) {
                return array_values(array_unique($colorNames));
            }
        }

        return array_values(array_unique($colorTokens));
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
