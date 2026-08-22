<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'stripe' => [
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URL'),
    ],

    'shipstation' => [
        'base_url' => env('SHIPSTATION_BASE_URL', 'https://ssapi.shipstation.com'),
        'api_key' => env('SHIPSTATION_API_KEY'),
        'api_secret' => env('SHIPSTATION_API_SECRET'),
        'verify_ssl' => env('SHIPSTATION_VERIFY_SSL', true),
        'ca_bundle' => env('SHIPSTATION_CA_BUNDLE'),
    ],

    'ups' => [
        'base_url' => env('UPS_BASE_URL', env('UPS_API_URL', 'https://wwwcie.ups.com')),
        'oauth_base_url' => env('UPS_OAUTH_BASE_URL', env('UPS_API_URL', 'https://wwwcie.ups.com')),
        'token_endpoint' => env('UPS_TOKEN_ENDPOINT', '/security/v1/oauth/token'),
        'rate_endpoint' => env('UPS_RATE_ENDPOINT', '/api/rating/v2409/Shop'),
        'shipment_endpoint' => env('UPS_SHIPMENT_ENDPOINT', '/api/shipments/v2409/ship'),
        'verify_ssl' => env('UPS_VERIFY_SSL', true),
        'ca_bundle' => env('UPS_CA_BUNDLE'),
        'client_id' => env('UPS_CLIENT_ID'),
        'client_secret' => env('UPS_CLIENT_SECRET'),
        'shipper_number' => env('UPS_SHIPPER_NUMBER'),
        'shipper_name' => env('UPS_SHIPPER_NAME', 'viveren'),
        'origin_address_1' => env('UPS_ORIGIN_ADDRESS_1', '123 Warehouse Rd'),
        'origin_city' => env('UPS_ORIGIN_CITY', 'Billerica'),
        'origin_state' => env('UPS_ORIGIN_STATE', 'MA'),
        'origin_postal_code' => env('UPS_ORIGIN_POSTAL_CODE', '01821'),
        'origin_country' => env('UPS_ORIGIN_COUNTRY', 'US'),
        'use_negotiated_rates' => env('UPS_USE_NEGOTIATED_RATES', true),
        'service_code' => env('UPS_SERVICE_CODE', '03'),
        'service_description' => env('UPS_SERVICE_DESCRIPTION', 'UPS Ground'),
        'packaging_code' => env('UPS_PACKAGING_CODE', '02'),
    ],

    'public_orders' => [
        'api_key' => env('PUBLIC_ORDERS_API_KEY'),
    ],

    'joor' => [
        'auth_base_url' => env('JOOR_AUTH_BASE_URL', 'https://atlas-sandbox.jooraccess.com'),
        'api_base_url' => env('JOOR_API_BASE_URL', 'https://apisandbox.jooraccess.com/v4'),
        'auth_endpoint' => env('JOOR_AUTH_ENDPOINT', '/auth/'),
        'products_endpoint' => env('JOOR_PRODUCTS_ENDPOINT', '/products/bulk_create'),
        'verify_ssl' => env('JOOR_VERIFY_SSL', true),
        'timeout' => env('JOOR_TIMEOUT', 30),
        'client_id' => env('JOOR_CLIENT_ID'),
        'client_secret' => env('JOOR_CLIENT_SECRET'),
        'username' => env('JOOR_USERNAME'),
        'password' => env('JOOR_PASSWORD'),
        'token' => env('JOOR_API_TOKEN'),
        'joor_id' => env('JOOR_ID'),
        'user_id' => env('JOOR_USER_ID'),
        'default_tag_parent_id' => env('JOOR_DEFAULT_TAG_PARENT_ID'),
        'color_tag_parent_id' => env('JOOR_COLOR_TAG_PARENT_ID'),
        'category_tag_parent_id' => env('JOOR_CATEGORY_TAG_PARENT_ID'),
        'default_category_id' => env('JOOR_DEFAULT_CATEGORY_ID'),
        'category_name_map' => env('JOOR_CATEGORY_NAME_MAP'),
        'sku_color_trait_id' => env('JOOR_SKU_COLOR_TRAIT_ID', 'U0tVVHJhaXQ6U3R5bGVDb2xvcg=='),
        'sku_size_trait_id' => env('JOOR_SKU_SIZE_TRAIT_ID', 'U0tVVHJhaXQ6U2l6ZQ=='),
        'default_sku_size' => env('JOOR_DEFAULT_SKU_SIZE', 'One Size'),
        'price_type_id' => env('JOOR_PRICE_TYPE_ID'),
    ],

];
