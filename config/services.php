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
    
    'veeqo' => [
        'base_url' => env('VEEQO_BASE_URL', 'https://api.veeqo.com'),
        'api_key' => env('VEEQO_API_KEY'),
        'verify_ssl' => env('VEEQO_VERIFY_SSL', true),
        'ca_bundle' => env('VEEQO_CA_BUNDLE'),
        'origin' => [
            'first_name' => env('VEEQO_ORIGIN_FIRST_NAME', '1971co'),
            'last_name' => env('VEEQO_ORIGIN_LAST_NAME', 'Warehouse'),
            'address1' => env('VEEQO_ORIGIN_ADDRESS1'),
            'city' => env('VEEQO_ORIGIN_CITY'),
            'state' => env('VEEQO_ORIGIN_STATE'),
            'zip' => env('VEEQO_ORIGIN_ZIP'),
            'country' => env('VEEQO_ORIGIN_COUNTRY', 'US'),
        ],
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
        // Web portal used to build "view in JOOR" links, shown alongside the
        // GET /orders/sku_line_items line-item breakdown.
        'portal_base_url' => env('JOOR_PORTAL_BASE_URL', 'https://sandbox.jooraccess.com'),
    ],

];
