<?php

namespace App\Services;

use App\Models\CheckoutOrder;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class UpsService
{
    /**
     * Check whether the minimum UPS configuration exists.
     */
    public function isConfigured(): bool
    {
        return $this->config('client_id') !== ''
            && $this->config('client_secret') !== ''
            && $this->config('shipper_number') !== '';
    }

    /**
     * Get a single UPS shipping charge.
     *
     * This method is kept for backwards compatibility with existing
     * checkout code that expects a float.
     */
    public function getShipmentCharge(array $payload): float
    {
        $rates = $this->getShipmentRates($payload);

        if ($rates === []) {
            throw new RuntimeException(
                'UPS did not return any available shipping rates.'
            );
        }

        /*
         * Prefer the configured service if it exists.
         * Otherwise return the first available UPS rate.
         */
        $preferredServiceCode = (string) $this->config(
            'service_code',
            ''
        );

        if ($preferredServiceCode !== '') {
            foreach ($rates as $rate) {
                if ((string) ($rate['service_code'] ?? '') === $preferredServiceCode) {
                    return (float) $rate['amount'];
                }
            }
        }

        return (float) $rates[0]['amount'];
    }

    /**
     * Get all UPS rates returned by the Rating API.
     *
     * Example return:
     *
     * [
     *     [
     *         'service_code' => '03',
     *         'service_description' => 'UPS Ground',
     *         'amount' => 12.84,
     *         'currency' => 'USD',
     *         'negotiated_amount' => 10.42,
     *         'published_amount' => 12.84,
     *         'guaranteed_delivery' => null,
     *     ],
     * ]
     */
    public function getShipmentRates(array $payload): array
    {
        $this->ensureConfigured();

        $shipment = $this->buildRatingShipment($payload);

        $requestPayload = [
            'RateRequest' => [
                'Request' => [
                    'RequestOption' => $this->config(
                        'rate_request_option',
                        'Shop'
                    ),
                    'TransactionReference' => [
                        'CustomerContext' => 'Checkout Shipping Quote',
                    ],
                ],
                'Shipment' => $shipment,
            ],
        ];

        $rateEndpoint = $this->config(
            'rate_endpoint',
            '/api/rating/v2409/Rate'
        );

        $response = $this->request(
            'post',
            $rateEndpoint,
            $requestPayload
        );

        $rates = $this->extractRates($response);

        if ($rates === []) {
            Log::warning(
                'UPS returned no shipping rates.',
                [
                    'response' => $response,
                    'payload' => $requestPayload,
                ]
            );

            throw new RuntimeException(
                'UPS did not return any valid shipping rates.'
            );
        }

        return $rates;
    }

    /**
     * Build the UPS Rate API Shipment object.
     */
    protected function buildRatingShipment(array $payload): array
    {
        $countryCode = $this->normalizeCountryCode(
            $payload['country'] ?? null
        );

        $state = strtoupper(
            trim((string) ($payload['state'] ?? ''))
        );

        $city = trim(
            (string) ($payload['city'] ?? '')
        );

        $postalCode = trim(
            (string) ($payload['postal_code'] ?? '')
        );

        if ($postalCode === '') {
            throw new RuntimeException(
                'Destination postal code is required for UPS rating.'
            );
        }

        $isResidential = $this->resolveResidentialFlag(
            $payload['residential'] ?? null
        );

        $destinationAddress = [
            'PostalCode' => $postalCode,
            'CountryCode' => $countryCode,
        ];

        if ($state !== '') {
            $destinationAddress['StateProvinceCode'] = $state;
        }

        if ($city !== '') {
            $destinationAddress['City'] = $city;
        }

        if ($isResidential) {
            $destinationAddress['ResidentialAddressIndicator'] = 'Y';
        }

        $packages = $this->resolvePackages($payload);

        if ($packages === []) {
            throw new RuntimeException(
                'At least one valid UPS package is required for rating.'
            );
        }

        return [
            'Shipper' => [
                'ShipperNumber' => $this->config('shipper_number'),
                'Address' => $this->buildOriginAddress(),
            ],

            'ShipTo' => [
                'Address' => $destinationAddress,
            ],

            'ShipFrom' => [
                'Address' => $this->buildOriginAddress(),
            ],

            'ShipmentRatingOptions' => [
                'NegotiatedRatesIndicator' => 'Y',
            ],

            'Package' => $packages,
        ];
    }

    /**
     * Build package information for UPS Rating API.
     *
     * Supported payload formats:
     *
     * 1. Explicit packages:
     *
     * 'packages' => [
     *     [
     *         'weight' => 2.5,
     *         'weight_unit' => 'LBS',
     *         'length' => 14,
     *         'width' => 12,
     *         'height' => 4,
     *         'dimension_unit' => 'IN',
     *     ],
     * ]
     *
     * 2. Single package:
     *
     * 'weight' => 2.5,
     * 'dimensions' => [
     *     'length' => 14,
     *     'width' => 12,
     *     'height' => 4,
     * ],
     *
     * 3. Product items:
     *
     * 'items' => [
     *     [
     *         'quantity' => 1,
     *         'weight' => 2.5,
     *         'weight_unit' => 'LBS',
     *         'length' => 14,
     *         'width' => 12,
     *         'height' => 4,
     *         'dimension_unit' => 'IN',
     *     ],
     * ]
     */
    protected function resolvePackages(array $payload): array
    {
        /*
         * Highest priority:
         * Explicit packages supplied by checkout/backend.
         */
        if (isset($payload['packages']) && is_array($payload['packages'])) {
            $packages = [];

            foreach ($payload['packages'] as $package) {
                if (!is_array($package)) {
                    continue;
                }

                $normalized = $this->normalizePackage($package);

                if ($normalized !== null) {
                    $packages[] = $normalized;
                }
            }

            if ($packages !== []) {
                return $packages;
            }
        }

        $items = is_array($payload['items'] ?? null)
            ? $payload['items']
            : [];

        /*
         * If an explicit dimensions object exists, use it as one package.
         */
        if (isset($payload['dimensions']) && is_array($payload['dimensions'])) {
            $singlePackage = [
                'weight' => $payload['weight'] ?? null,
                'weight_unit' => $payload['weight_unit'] ?? 'LBS',

                'length' => $payload['dimensions']['length'] ?? null,
                'width' => $payload['dimensions']['width'] ?? null,
                'height' => $payload['dimensions']['height'] ?? null,

                'dimension_unit' => $payload['dimensions']['unit']
                    ?? $payload['dimension_unit']
                    ?? 'IN',
            ];

            $normalized = $this->normalizePackage(
                $singlePackage
            );

            if ($normalized !== null) {
                return [$normalized];
            }
        }

        /*
         * If there are product items, try to build one package from them.
         *
         * This is intentionally conservative:
         *
         * - Weight is summed.
         * - Largest length/width/height are used.
         *
         * For the most accurate shipping price, your application should
         * send explicit packages[] representing the boxes you actually use.
         */
        if ($items !== []) {
            $package = $this->buildPackageFromItems($items);

            if ($package !== null) {
                return [$package];
            }
        }

        /*
         * Finally allow a weight-only package.
         *
         * UPS may reject this for services/accounts that require
         * dimensions. We intentionally do NOT invent dimensions here.
         */
        if (isset($payload['weight'])) {
            $normalized = $this->normalizePackage([
                'weight' => $payload['weight'],
                'weight_unit' => $payload['weight_unit'] ?? 'LBS',
            ]);

            if ($normalized !== null) {
                return [$normalized];
            }
        }

        return [];
    }

    /**
     * Build one package from item-level information.
     */
    protected function buildPackageFromItems(array $items): ?array
    {
        $totalWeightLbs = 0.0;

        $maxLengthIn = null;
        $maxWidthIn = null;
        $maxHeightIn = null;

        $hasWeight = false;
        $hasDimensions = true;

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $quantity = max(
                1,
                (int) ($item['quantity'] ?? 1)
            );

            /*
             * Weight
             */
            $weight = $this->normalizeWeightToLbs(
                $item['weight'] ?? null,
                $item['weight_unit'] ?? 'LBS'
            );

            if ($weight !== null && $weight > 0) {
                $hasWeight = true;

                $totalWeightLbs += $weight * $quantity;
            }

            /*
             * Dimensions
             */
            $length = $this->normalizeDimensionToInches(
                $item['length'] ?? null,
                $item['dimension_unit'] ?? 'IN'
            );

            $width = $this->normalizeDimensionToInches(
                $item['width'] ?? null,
                $item['dimension_unit'] ?? 'IN'
            );

            $height = $this->normalizeDimensionToInches(
                $item['height'] ?? null,
                $item['dimension_unit'] ?? 'IN'
            );

            if (
                $length === null ||
                $width === null ||
                $height === null
            ) {
                $hasDimensions = false;
                continue;
            }

            $maxLengthIn = max(
                $maxLengthIn ?? 0,
                $length
            );

            $maxWidthIn = max(
                $maxWidthIn ?? 0,
                $width
            );

            $maxHeightIn = max(
                $maxHeightIn ?? 0,
                $height
            );
        }

        if (!$hasWeight) {
            return null;
        }

        $package = [
            'weight' => $totalWeightLbs,
            'weight_unit' => 'LBS',
        ];

        /*
         * Do not fabricate dimensions.
         *
         * If dimensions are unavailable, UPS can decide whether the
         * request is acceptable. If your UPS account requires dimensions,
         * checkout should require them.
         */
        if (
            $hasDimensions &&
            $maxLengthIn !== null &&
            $maxWidthIn !== null &&
            $maxHeightIn !== null
        ) {
            $package['length'] = $maxLengthIn;
            $package['width'] = $maxWidthIn;
            $package['height'] = $maxHeightIn;
            $package['dimension_unit'] = 'IN';
        }

        return $this->normalizePackage($package);
    }

    /**
     * Normalize one package into the exact structure required by
     * UPS Rating/Shipping payloads.
     */
    protected function normalizePackage(array $package): ?array
    {
        $weight = $this->normalizeWeightToLbs(
            $package['weight'] ?? null,
            $package['weight_unit']
                ?? $package['unit']
                ?? 'LBS'
        );

        if ($weight === null || $weight <= 0) {
            return null;
        }

        $weight = max(
            0.01,
            round($weight, 3)
        );

        $result = [
            'PackagingType' => [
                'Code' => (string) $this->config(
                    'packaging_code',
                    '02'
                ),
            ],

            'PackageWeight' => [
                'UnitOfMeasurement' => [
                    'Code' => 'LBS',
                ],

                'Weight' => number_format(
                    $weight,
                    2,
                    '.',
                    ''
                ),
            ],
        ];

        /*
         * Dimensions are optional in the data structure, but if one
         * dimension is provided then all three must be valid.
         */
        $hasAnyDimension =
            isset($package['length']) ||
            isset($package['width']) ||
            isset($package['height']);

        if ($hasAnyDimension) {
            $length = $this->normalizeDimensionToInches(
                $package['length'] ?? null,
                $package['dimension_unit'] ?? 'IN'
            );

            $width = $this->normalizeDimensionToInches(
                $package['width'] ?? null,
                $package['dimension_unit'] ?? 'IN'
            );

            $height = $this->normalizeDimensionToInches(
                $package['height'] ?? null,
                $package['dimension_unit'] ?? 'IN'
            );

            if (
                $length === null ||
                $width === null ||
                $height === null
            ) {
                throw new RuntimeException(
                    'UPS package dimensions must contain valid length, width and height.'
                );
            }

            $result['Dimensions'] = [
                'UnitOfMeasurement' => [
                    'Code' => 'IN',
                ],

                'Length' => $this->formatDimension(
                    $length
                ),

                'Width' => $this->formatDimension(
                    $width
                ),

                'Height' => $this->formatDimension(
                    $height
                ),
            ];
        }

        return $result;
    }

    /**
     * Convert supported weight units into pounds.
     */
    protected function normalizeWeightToLbs(
        mixed $weight,
        mixed $unit = 'LBS'
    ): ?float {
        if ($weight === null || $weight === '') {
            return null;
        }

        if (is_string($weight)) {
            $raw = trim($weight);

            if ($raw === '') {
                return null;
            }

            /*
             * Support values such as:
             * "2.5"
             * "2.5 lb"
             * "2.5 kg"
             */
            if (
                preg_match(
                    '/(-?\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/',
                    $raw,
                    $matches
                ) === 1
            ) {
                $weight = (float) $matches[1];

                if (!empty($matches[2])) {
                    $unit = $matches[2];
                }
            } else {
                return null;
            }
        }

        if (!is_numeric($weight)) {
            return null;
        }

        $value = (float) $weight;

        if ($value <= 0) {
            return null;
        }

        $normalizedUnit = strtoupper(
            trim((string) $unit)
        );

        return match ($normalizedUnit) {
            'LB',
            'LBS',
            'POUND',
            'POUNDS' => $value,

            'OZ',
            'OUNCE',
            'OUNCES' => $value / 16,

            'KG',
            'KGS',
            'KILOGRAM',
            'KILOGRAMS' => $value * 2.2046226218,

            'G',
            'GRAM',
            'GRAMS' => $value * 0.0022046226218,

            default => $value,
        };
    }

    /**
     * Convert supported dimension units into inches.
     *
     * UPS rating request is sent in inches.
     */
    protected function normalizeDimensionToInches(
        mixed $value,
        mixed $unit = 'IN'
    ): ?float {
        if ($value === null || $value === '') {
            return null;
        }

        if (!is_numeric($value)) {
            return null;
        }

        $numeric = (float) $value;

        if ($numeric <= 0) {
            return null;
        }

        $normalizedUnit = strtoupper(
            trim((string) $unit)
        );

        $inches = match ($normalizedUnit) {
            'IN',
            'INCH',
            'INCHES' => $numeric,

            'CM',
            'CENTIMETER',
            'CENTIMETERS' => $numeric / 2.54,

            'MM',
            'MILLIMETER',
            'MILLIMETERS' => $numeric / 25.4,

            default => $numeric,
        };

        return max(
            1.0,
            ceil($inches)
        );
    }

    /**
     * Format UPS dimensions.
     */
    protected function formatDimension(float $value): string
    {
        return number_format(
            max(1, $value),
            0,
            '.',
            ''
        );
    }

    /**
     * Extract all available UPS rates.
     */
    protected function extractRates(array $response): array
    {
        $ratedShipments = data_get(
            $response,
            'RateResponse.RatedShipment'
        );

        if ($ratedShipments === null) {
            $ratedShipments = data_get(
                $response,
                'RatedShipment'
            );
        }

        if ($ratedShipments === null) {
            return [];
        }

        /*
         * UPS can return one object instead of an array when there
         * is only one rate.
         */
        if (
            is_array($ratedShipments) &&
            $this->isAssociativeArray($ratedShipments)
        ) {
            $ratedShipments = [$ratedShipments];
        }

        if (!is_array($ratedShipments)) {
            return [];
        }

        $rates = [];

        foreach ($ratedShipments as $shipment) {
            if (!is_array($shipment)) {
                continue;
            }

            $serviceCode = (string) (
                data_get($shipment, 'Service.Code')
                ?? data_get($shipment, 'Service.Code')
                ?? ''
            );

            $serviceDescription = (string) (
                data_get($shipment, 'Service.Description')
                ?? ''
            );

            $publishedAmount = $this->extractMoneyValue(
                $shipment,
                [
                    'TotalCharges.MonetaryValue',
                    'TotalCharges.CurrencyCode',
                ]
            );

            /*
             * Negotiated rates may be returned separately.
             *
             * UPS documentation notes that negotiated rates can be
             * returned when the account is authorized and the request
             * asks for them.
             */
            $negotiatedAmount = $this->extractNegotiatedAmount(
                $shipment
            );

            $amount = $negotiatedAmount
                ?? $publishedAmount['amount'];

            if ($amount === null) {
                continue;
            }

            $currency =
                $negotiatedAmount !== null
                    ? $this->extractNegotiatedCurrency($shipment)
                    : $publishedAmount['currency'];

            $guaranteedDelivery = data_get(
                $shipment,
                'GuaranteedDelivery'
            );

            $rates[] = [
                'service_code' => $serviceCode,
                'service_description' => $serviceDescription,

                'amount' => round(
                    (float) $amount,
                    2
                ),

                'currency' => $currency ?: 'USD',

                'published_amount' => $publishedAmount['amount'] !== null
                    ? round(
                        (float) $publishedAmount['amount'],
                        2
                    )
                    : null,

                'negotiated_amount' => $negotiatedAmount !== null
                    ? round(
                        (float) $negotiatedAmount,
                        2
                    )
                    : null,

                'guaranteed_delivery' => $guaranteedDelivery,

                'raw' => $shipment,
            ];
        }

        /*
         * Sort from cheapest to most expensive.
         */
        usort(
            $rates,
            static fn (array $a, array $b): int =>
                $a['amount'] <=> $b['amount']
        );

        return $rates;
    }

    /**
     * Extract published TotalCharges.
     */
    protected function extractMoneyValue(
        array $shipment,
        array $paths
    ): array {
        $amount = null;
        $currency = null;

        foreach ($paths as $path) {
            if (str_ends_with($path, 'MonetaryValue')) {
                $value = data_get(
                    $shipment,
                    $path
                );

                if (
                    $value !== null &&
                    $value !== ''
                ) {
                    $amount = (float) $value;
                    break;
                }
            }
        }

        $currencyCandidates = [
            'TotalCharges.CurrencyCode',
            'TotalCharges.Currency',
            'CurrencyCode',
        ];

        foreach ($currencyCandidates as $path) {
            $value = data_get(
                $shipment,
                $path
            );

            if ($value !== null && $value !== '') {
                $currency = (string) $value;
                break;
            }
        }

        return [
            'amount' => $amount,
            'currency' => $currency,
        ];
    }

    /**
     * Extract negotiated rate from the common UPS response structures.
     */
    protected function extractNegotiatedAmount(
        array $shipment
    ): ?float {
        $candidates = [
            'NegotiatedRateCharges.TotalCharge.MonetaryValue',
            'NegotiatedRateCharges.TotalCharges.MonetaryValue',
            'NegotiatedRatesCharges.TotalCharge.MonetaryValue',
            'NegotiatedRatesCharges.TotalCharges.MonetaryValue',
        ];

        foreach ($candidates as $path) {
            $value = data_get(
                $shipment,
                $path
            );

            if ($value !== null && $value !== '') {
                return (float) $value;
            }
        }

        return null;
    }

    /**
     * Extract negotiated currency.
     */
    protected function extractNegotiatedCurrency(
        array $shipment
    ): ?string {
        $candidates = [
            'NegotiatedRateCharges.TotalCharge.CurrencyCode',
            'NegotiatedRateCharges.TotalCharges.CurrencyCode',
            'NegotiatedRatesCharges.TotalCharge.CurrencyCode',
            'NegotiatedRatesCharges.TotalCharges.CurrencyCode',
        ];

        foreach ($candidates as $path) {
            $value = data_get(
                $shipment,
                $path
            );

            if ($value !== null && $value !== '') {
                return (string) $value;
            }
        }

        return null;
    }

    /**
     * Create a shipment from a CheckoutOrder.
     *
     * IMPORTANT:
     *
     * This method now uses the same package construction logic as
     * rating so that the package weight/dimensions are consistent.
     */
    public function createShipmentForCheckoutOrder(
        CheckoutOrder $order
    ): array {
        $this->ensureConfigured();

        $countryCode = $this->normalizeCountryCode(
            $order->country
        );

        $state = strtoupper(
            trim((string) ($order->state ?? ''))
        );

        $city = trim(
            (string) ($order->city ?? '')
        );

        $postalCode = trim(
            (string) ($order->postal_code ?? '')
        );

        $fullName = trim(
            $order->first_name . ' ' . $order->last_name
        );

        $items = is_array($order->items ?? null)
            ? $order->items
            : [];

        /*
         * Prefer order-level packages if your CheckoutOrder has them.
         */
        $shipmentInput = [
            'country' => $countryCode,
            'state' => $state,
            'city' => $city,
            'postal_code' => $postalCode,
            'items' => $items,
        ];

        /*
         * If the order has an explicit weight, use it.
         */
        if (
            isset($order->weight) &&
            is_numeric($order->weight)
        ) {
            $shipmentInput['weight'] = $order->weight;
            $shipmentInput['weight_unit'] =
                $order->weight_unit ?? 'LBS';
        }

        /*
         * If the order has explicit packages, use them.
         */
        if (
            isset($order->packages) &&
            is_array($order->packages)
        ) {
            $shipmentInput['packages'] = $order->packages;
        }

        $packages = $this->resolvePackages(
            $shipmentInput
        );

        if ($packages === []) {
            throw new RuntimeException(
                'Unable to determine valid UPS package information for this order.'
            );
        }

        $shipmentPackages = [];

        foreach ($packages as $package) {
            $shipmentPackage = [
                'Packaging' => [
                    'Code' => (string) $this->config(
                        'packaging_code',
                        '02'
                    ),

                    'Description' => 'Customer Box',
                ],

                'PackageWeight' => $package['PackageWeight'],
            ];

            /*
             * Keep dimensions identical to the rate request.
             */
            if (isset($package['Dimensions'])) {
                $shipmentPackage['Dimensions'] =
                    $package['Dimensions'];
            }

            $shipmentPackages[] = $shipmentPackage;
        }

        $shipmentPayload = [
            'ShipmentRequest' => [
                'Request' => [
                    'RequestOption' => 'nonvalidate',

                    'TransactionReference' => [
                        'CustomerContext' =>
                            'Checkout Order ' .
                            $order->order_number,
                    ],
                ],

                'Shipment' => [
                    'Description' =>
                        'Order ' .
                        $order->order_number,

                    'Shipper' => [
                        'Name' => $this->config(
                            'shipper_name',
                            '1971Co'
                        ),

                        'ShipperNumber' =>
                            $this->config(
                                'shipper_number'
                            ),

                        'Address' => [
                            'AddressLine' => [
                                $this->config(
                                    'origin_address_1',
                                    '123 Warehouse Rd'
                                ),
                            ],

                            'City' =>
                                $this->config(
                                    'origin_city',
                                    'Billerica'
                                ),

                            'StateProvinceCode' =>
                                $this->config(
                                    'origin_state',
                                    'MA'
                                ),

                            'PostalCode' =>
                                $this->config(
                                    'origin_postal_code',
                                    '01821'
                                ),

                            'CountryCode' =>
                                $this->config(
                                    'origin_country',
                                    'US'
                                ),
                        ],
                    ],

                    'ShipTo' => [
                        'Name' =>
                            $fullName !== ''
                                ? $fullName
                                : 'Customer',

                        'Address' => [
                            'AddressLine' => [
                                trim(
                                    (string)
                                    $order->address_line_1
                                ),
                            ],

                            'City' => $city,
                            'StateProvinceCode' => $state,
                            'PostalCode' => $postalCode,
                            'CountryCode' => $countryCode,
                        ],
                    ],

                    'Service' => [
                        'Code' => $this->config(
                            'service_code',
                            '03'
                        ),

                        'Description' => $this->config(
                            'service_description',
                            'UPS Ground'
                        ),
                    ],

                    'PaymentInformation' => [
                        'ShipmentCharge' => [
                            'Type' => '01',

                            'BillShipper' => [
                                'AccountNumber' =>
                                    $this->config(
                                        'shipper_number'
                                    ),
                            ],
                        ],
                    ],

                    'Package' => $shipmentPackages,
                ],

                'LabelSpecification' => [
                    'LabelImageFormat' => [
                        'Code' => $this->config(
                            'label_image_format',
                            'GIF'
                        ),
                    ],
                ],
            ],
        ];

        $shipmentEndpoint = $this->config(
            'shipment_endpoint',
            '/api/shipments/v2409/ship'
        );

        return $this->request(
            'post',
            $shipmentEndpoint,
            $shipmentPayload
        );
    }

    /**
     * Create a shipment using a raw UPS shipment payload.
     */
    public function createShipment(
        array $shipmentPayload
    ): array {
        $this->ensureConfigured();

        $shipmentEndpoint = $this->config(
            'shipment_endpoint',
            '/api/shipments/v2409/ship'
        );

        return $this->request(
            'post',
            $shipmentEndpoint,
            $shipmentPayload
        );
    }

    /**
     * Execute a UPS API request.
     */
    protected function request(
        string $method,
        string $path,
        array $payload,
        bool $allowPaymentRetry = true,
        bool $allowRateFallback = true
    ): array {
        $token = $this->getAccessToken();

        $isRateRequest = str_contains(
            $path,
            '/api/rating/'
        );

        $url =
            rtrim(
                $this->config(
                    'base_url',
                    'https://wwwcie.ups.com'
                ),
                '/'
            )
            . '/'
            . ltrim($path, '/');

        if ($isRateRequest) {
            Log::info('UPS shipping rate request payload.', [
                'method' => strtoupper($method),
                'url' => $url,
                'payload' => $payload,
            ]);
        }

        $request = $this->baseRequest()
            ->withToken($token)
            ->acceptJson()
            ->asJson()
            ->timeout(
                (int) $this->config(
                    'timeout',
                    25
                )
            )
            ->retry(
                (int) $this->config(
                    'retry_times',
                    1
                ),
                (int) $this->config(
                    'retry_sleep_ms',
                    300
                )
            )
            ->withHeaders([
                'transId' =>
                    (string) uniqid(
                        'ups_',
                        true
                    ),

                'transactionSrc' =>
                    (string) $this->config(
                        'transaction_source',
                        'LaravelCheckout'
                    ),
            ]);

        try {
            $response = $request->send(
                strtoupper($method),
                $url,
                [
                    'json' => $payload,
                ]
            );
        } catch (ConnectionException $exception) {
            /*
             * Never disable SSL verification in production.
             *
             * This fallback only exists for local Windows development
             * where cURL error 60 occurs.
             */
            if (!$this->isLocalSslError($exception)) {
                throw $exception;
            }

            $response = Http::withOptions([
                'verify' => false,
            ])
                ->withToken($token)
                ->acceptJson()
                ->asJson()
                ->timeout(
                    (int) $this->config(
                        'timeout',
                        25
                    )
                )
                ->retry(
                    (int) $this->config(
                        'retry_times',
                        1
                    ),
                    (int) $this->config(
                        'retry_sleep_ms',
                        300
                    )
                )
                ->withHeaders([
                    'transId' =>
                        (string) uniqid(
                            'ups_',
                            true
                        ),

                    'transactionSrc' =>
                        (string) $this->config(
                            'transaction_source',
                            'LaravelCheckout'
                        ),
                ])
                ->send(
                    strtoupper($method),
                    $url,
                    [
                        'json' => $payload,
                    ]
                );
        }

        if ($response->failed()) {
            $body = $response->body();

            /*
             * UPS payment error fallback.
             */
            if (
                $allowPaymentRetry
                && str_contains(
                    $body,
                    '9120068'
                )
                && isset(
                    $payload[
                        'ShipmentRequest'
                    ]['Shipment'][
                        'PaymentInformation'
                    ]
                )
            ) {
                unset(
                    $payload[
                        'ShipmentRequest'
                    ]['Shipment'][
                        'PaymentInformation'
                    ]
                );

                return $this->request(
                    $method,
                    $path,
                    $payload,
                    false,
                    $allowRateFallback
                );
            }

            /*
             * If the Rate endpoint rejects the request with the
             * endpoint mismatch error, retry using Shop.
             */
            $isRateEndpointMismatch =
                $allowRateFallback
                && str_contains(
                    $path,
                    '/api/rating/v2409/Rate'
                )
                && str_contains(
                    $body,
                    '111100'
                );

            if ($isRateEndpointMismatch) {
                $fallbackPath =
                    '/api/rating/v2409/Shop';

                return $this->request(
                    'post',
                    $fallbackPath,
                    $payload,
                    $allowPaymentRetry,
                    false
                );
            }

            Log::error(
                'UPS API request failed.',
                [
                    'method' => strtoupper($method),
                    'url' => $url,
                    'status' => $response->status(),
                    'body' => $body,
                ]
            );

            throw new RuntimeException(
                'UPS API request failed: '
                . $response->status()
                . ' '
                . $body
            );
        }

        $json = $response->json();

        if ($isRateRequest) {
            Log::info('UPS shipping rate response received.', [
                'method' => strtoupper($method),
                'url' => $url,
                'status' => $response->status(),
                'response' => $json,
            ]);
        }

        if (!is_array($json)) {
            throw new RuntimeException(
                'UPS returned an invalid JSON response.'
            );
        }

        return $json;
    }

    /**
     * Get UPS OAuth 2.0 access token.
     */
    protected function getAccessToken(): string
    {
        $this->ensureConfigured();

        $oauthBaseUrl = $this->config(
            'oauth_base_url',
            $this->config(
                'base_url',
                'https://wwwcie.ups.com'
            )
        );

        $tokenEndpoint = $this->config(
            'token_endpoint',
            '/security/v1/oauth/token'
        );

        $tokenUrl =
            rtrim(
                $oauthBaseUrl,
                '/'
            )
            . '/'
            . ltrim(
                $tokenEndpoint,
                '/'
            );

        $request = $this->baseRequest()
            ->asForm()
            ->acceptJson()
            ->withBasicAuth(
                $this->config('client_id'),
                $this->config('client_secret')
            )
            ->timeout(
                (int) $this->config(
                    'oauth_timeout',
                    20
                )
            )
            ->retry(
                (int) $this->config(
                    'retry_times',
                    1
                ),
                (int) $this->config(
                    'retry_sleep_ms',
                    250
                )
            );

        try {
            $response = $request->post(
                $tokenUrl,
                [
                    'grant_type' =>
                        'client_credentials',
                ]
            );
        } catch (ConnectionException $exception) {
            if (!$this->isLocalSslError($exception)) {
                throw $exception;
            }

            $response = Http::withOptions([
                'verify' => false,
            ])
                ->asForm()
                ->acceptJson()
                ->withBasicAuth(
                    $this->config('client_id'),
                    $this->config('client_secret')
                )
                ->timeout(
                    (int) $this->config(
                        'oauth_timeout',
                        20
                    )
                )
                ->retry(
                    (int) $this->config(
                        'retry_times',
                        1
                    ),
                    (int) $this->config(
                        'retry_sleep_ms',
                        250
                    )
                )
                ->post(
                    $tokenUrl,
                    [
                        'grant_type' =>
                            'client_credentials',
                    ]
                );
        }

        if ($response->failed()) {
            throw new RuntimeException(
                'UPS OAuth failed: '
                . $response->status()
                . ' '
                . $response->body()
            );
        }

        $json = $response->json();

        $token = (string) data_get(
            $json,
            'access_token',
            ''
        );

        if ($token === '') {
            throw new RuntimeException(
                'UPS OAuth token is missing in response.'
            );
        }

        return $token;
    }

    /**
     * Base Laravel HTTP request.
     */
    protected function baseRequest(): PendingRequest
    {
        $request = Http::acceptJson();

        $caBundle = trim(
            (string) $this->config(
                'ca_bundle',
                ''
            )
        );

        $verifySsl = (bool) $this->config(
            'verify_ssl',
            true
        );

        if ($caBundle !== '') {
            return $request->withOptions([
                'verify' => $caBundle,
            ]);
        }

        if (!$verifySsl) {
            return $request->withOptions([
                'verify' => false,
            ]);
        }

        return $request;
    }

    /**
     * Determine whether a connection error is only a local
     * SSL certificate issue.
     */
    protected function isLocalSslError(
        ConnectionException $exception
    ): bool {
        return app()->environment('local')
            && str_contains(
                $exception->getMessage(),
                'cURL error 60'
            );
    }

    /**
     * Build the origin address used by UPS.
     */
    protected function buildOriginAddress(): array
    {
        $address = [
            'PostalCode' =>
                $this->config(
                    'origin_postal_code',
                    '01821'
                ),

            'CountryCode' =>
                $this->config(
                    'origin_country',
                    'US'
                ),
        ];

        $state = trim(
            (string) $this->config(
                'origin_state',
                'MA'
            )
        );

        $city = trim(
            (string) $this->config(
                'origin_city',
                'Billerica'
            )
        );

        if ($state !== '') {
            $address['StateProvinceCode'] =
                strtoupper($state);
        }

        if ($city !== '') {
            $address['City'] = $city;
        }

        return $address;
    }

    /**
     * Convert country names into ISO country codes.
     */
    protected function normalizeCountryCode(
        ?string $country
    ): string {
        $value = strtoupper(
            trim((string) $country)
        );

        if ($value === '') {
            return 'US';
        }

        if (strlen($value) === 2) {
            return $value;
        }

        $map = [
            'UNITED STATES' =>
                'US',

            'USA' =>
                'US',

            'UNITED STATES OF AMERICA' =>
                'US',

            'CANADA' =>
                'CA',

            'BANGLADESH' =>
                'BD',

            'INDIA' =>
                'IN',

            'PAKISTAN' =>
                'PK',

            'UNITED KINGDOM' =>
                'GB',

            'GREAT BRITAIN' =>
                'GB',

            'ENGLAND' =>
                'GB',

            'AUSTRALIA' =>
                'AU',

            'NEW ZEALAND' =>
                'NZ',

            'GERMANY' =>
                'DE',

            'FRANCE' =>
                'FR',

            'ITALY' =>
                'IT',

            'SPAIN' =>
                'ES',

            'NETHERLANDS' =>
                'NL',

            'SWEDEN' =>
                'SE',

            'NORWAY' =>
                'NO',

            'DENMARK' =>
                'DK',

            'SWITZERLAND' =>
                'CH',

            'JAPAN' =>
                'JP',

            'CHINA' =>
                'CN',

            'SINGAPORE' =>
                'SG',

            'UNITED ARAB EMIRATES' =>
                'AE',

            'SAUDI ARABIA' =>
                'SA',
        ];

        return $map[$value] ?? 'US';
    }

    /**
     * Resolve residential flag.
     *
     * Default is residential because ecommerce customers are often
     * residential addresses.
     */
    protected function resolveResidentialFlag(
        mixed $value
    ): bool {
        if ($value === null || $value === '') {
            return true;
        }

        if (is_bool($value)) {
            return $value;
        }

        return filter_var(
            $value,
            FILTER_VALIDATE_BOOLEAN
        );
    }

    /**
     * Ensure UPS configuration exists.
     */
    protected function ensureConfigured(): void
    {
        if (!$this->isConfigured()) {
            throw new RuntimeException(
                'UPS credentials are not configured.'
            );
        }
    }

    /**
     * Read UPS configuration.
     */
    protected function config(
        string $key,
        mixed $default = null
    ): mixed {
        return config(
            'services.ups.' . $key,
            $default
        );
    }

    /**
     * Determine whether an array is associative.
     */
    protected function isAssociativeArray(
        array $array
    ): bool {
        if ($array === []) {
            return false;
        }

        return array_keys($array) !== range(
            0,
            count($array) - 1
        );
    }
}