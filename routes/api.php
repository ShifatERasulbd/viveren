<?php

use App\Http\Controllers\ApiProductController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CanadaWarehouseStockController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CollectionController;
use App\Http\Controllers\ColorController;
use App\Http\Controllers\CheckoutOrderController;
use App\Http\Controllers\CompliancePageController;
use App\Http\Controllers\CustomerCartController;
use App\Http\Controllers\CustomerProfileController;
use App\Http\Controllers\JoorOrderController;
use App\Http\Controllers\AboutHeroController;
use App\Http\Controllers\AboutGivingBackController;
use App\Http\Controllers\AboutMissionController;
use App\Http\Controllers\AboutStoryController;
use App\Http\Controllers\AboutFabricTechnologyController;
use App\Http\Controllers\CommunityPageSectionController;
use App\Http\Controllers\FeatureController;
use App\Http\Controllers\GrandChildController;
use App\Http\Controllers\HeroController;
use App\Http\Controllers\HomeBackgroundSectionController;
use App\Http\Controllers\OurStorySectionController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PublicApiKeyController;
use App\Http\Controllers\ReturnRequestFeedController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SizeController;
use App\Http\Controllers\SubCategoryController;
use App\Http\Controllers\Payment\StripeController;
use App\Http\Controllers\ShipStationController;
use App\Http\Controllers\UsLocationController;
use App\Http\Controllers\TrendingSectionController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\GoogleAuthController;

// Admin panel password login (used by /admin)
Route::post('/login', [AuthController::class, 'login'])->middleware(['web', 'throttle:10,1']);


// Updated OTP Login Routes
Route::post('/login/send-otp', [AuthController::class, 'sendOtp'])->middleware(['web', 'throttle:6,1']);
Route::post('/login/verify-otp', [AuthController::class, 'verifyOtp'])->middleware(['web', 'throttle:10,1']);

Route::post('/register', [AuthController::class, 'register'])->middleware(['web', 'throttle:6,1']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware(['web', 'throttle:6,1']);
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware(['web', 'throttle:6,1']);
Route::get('/public/about-hero', [AboutHeroController::class, 'publicIndex']);
Route::get('/public/about-story', [AboutStoryController::class, 'publicIndex']);
Route::get('/public/about-mission', [AboutMissionController::class, 'publicIndex']);
Route::get('/public/about-giving-back', [AboutGivingBackController::class, 'publicIndex']);
Route::get('/public/about-fabric-technology', [AboutFabricTechnologyController::class, 'publicIndex']);
Route::get('/public/colors', [ColorController::class, 'index']);
Route::get('/public/collections', [CollectionController::class, 'publicIndex']);
Route::get('/public/hero', [HeroController::class, 'publicIndex']);
Route::get('/public/heroes', [HeroController::class, 'publicList']);
Route::get('/public/features', [FeatureController::class, 'publicIndex']);
Route::get('/public/home-background-section', [HomeBackgroundSectionController::class, 'publicIndex']);
Route::get('/public/trending-section', [TrendingSectionController::class, 'publicIndex']);
Route::get('/public/our-story', [OurStorySectionController::class, 'publicIndex']);
Route::get('/public/products', [ProductController::class, 'publicIndex']);
Route::get('/public/new-arrivals', [ProductController::class, 'newArrivals']);
Route::get('/public/shop-products', [ProductController::class, 'publicShopIndex']);
Route::get('/public/sizes', [SizeController::class, 'index']);
Route::get('/public/categories', [CategoryController::class, 'index']);
Route::get('/public/sub-categories', [SubCategoryController::class, 'index']);
Route::get('/public/grand-childs', [GrandChildController::class, 'index']);
Route::get('/public/settings', [SettingsController::class, 'publicLatest']);
Route::get('/public/best-sellers-section', [SettingsController::class, 'publicBestSellersSection']);
Route::get('/public/stripe-config', [StripeController::class, 'publicConfig']);
Route::get('/public/community-page-sections', [CommunityPageSectionController::class, 'publicIndex']);
Route::get('/public/sustainability-hero', [App\Http\Controllers\SustainabilityHeroController::class, 'publicIndex']);
Route::get('/public/sustainability-longivity', [App\Http\Controllers\SustainabilityLongivityController::class, 'index']);
Route::get('/public/sustainability-thought-ful', [App\Http\Controllers\SustainabilityThoughtFullController::class, 'index']);
Route::get('/public/compliance', [App\Http\Controllers\CompliancePageController::class, 'publicIndex']);

Route::get('/public/orders/{orderNumber}', [CheckoutOrderController::class, 'publicShow']);

Route::post('/public/shipping/quote', [CheckoutOrderController::class, 'quoteShipping']);
Route::get('/public/locations/states', [UsLocationController::class, 'states']);
Route::get('/public/locations/cities', [UsLocationController::class, 'citiesByState']);
Route::get('/public/locations/postal-code', [UsLocationController::class, 'postalCodeByCityState']);
Route::post('/public/orders', [CheckoutOrderController::class, 'store']);
Route::middleware('public-api-key')->prefix('/public/orders-feed')->group(function () {
	Route::get('/', [CheckoutOrderController::class, 'publicExternalIndex']);
	Route::get('/{checkoutOrder}', [CheckoutOrderController::class, 'publicExternalShow']);
	Route::put('/{checkoutOrder}/status', [CheckoutOrderController::class, 'publicExternalUpdateStatus']);
});
Route::middleware('public-api-key')->prefix('/public/return-requests-feed')->group(function () {
	Route::get('/', [ReturnRequestFeedController::class, 'publicExternalIndex']);
	Route::get('/{id}', [ReturnRequestFeedController::class, 'publicExternalShow'])->whereNumber('id');
	Route::put('/{id}/status', [ReturnRequestFeedController::class, 'publicExternalUpdateStatus'])->whereNumber('id');
});
Route::post('/create-payment-intent', [StripeController::class, 'createPaymentIntent']);
Route::post('auth/google/callback', [GoogleAuthController::class, 'handleGoogleCallback']);
Route::post('/shipping/orders', [ShipStationController::class, 'storeOrder']);
// The storefront calls this while bootstrapping both guest and authenticated sessions.
// Return a JSON null for guests instead of a 401 so a guest page does not report a
// failed resource before the user has chosen to log in.
Route::get('/user', function (Request $request) {
	return response()->json($request->user());
});

Route::middleware('auth:sanctum')->group(function () {

    // Admin: update trending personalization
    Route::post('/trending-section', [TrendingSectionController::class, 'update']);

    // Public endpoints below are also defined above (outside this group) for reading.

	Route::post('/logout', [AuthController::class, 'logout'])->middleware('web');

	Route::middleware('user-type:customer')->group(function () {
		Route::get('/customer/orders', [CheckoutOrderController::class, 'customerIndex']);
		Route::get('/customer/orders/recent-items', [CheckoutOrderController::class, 'customerRecentItems']);
		Route::get('/customer/orders/{checkoutOrder}', [CheckoutOrderController::class, 'customerShow']);
		Route::put('/customer/orders/{checkoutOrder}/cancel', [CheckoutOrderController::class, 'customerCancel']);
		Route::get('/customer/orders/{checkoutOrder}/return-options', [CheckoutOrderController::class, 'customerReturnOptions']);
		// POST, not PUT: PHP only parses multipart uploads (the damage video) on POST
		Route::post('/customer/orders/{checkoutOrder}/return', [CheckoutOrderController::class, 'customerRequestReturn']);
		Route::post('/customer/orders/{checkoutOrder}/return/confirm', [CheckoutOrderController::class, 'customerConfirmReturn']);
		Route::put('/customer/profile', [CustomerProfileController::class, 'update']);
		Route::get('/customer/cart', [CustomerCartController::class, 'index']);
		Route::put('/customer/cart', [CustomerCartController::class, 'replace']);
		Route::post('/customer/cart/merge', [CustomerCartController::class, 'merge']);
	});

	Route::middleware('user-type:admin')->group(function () {

	Route::put('/sizes/reorder', [SizeController::class, 'reorder']);
	Route::apiResource('/sizes', SizeController::class)->whereNumber('size');

	Route::apiResource('/colors', ColorController::class);
	Route::get('/heroes', [HeroController::class, 'index']);
	Route::post('/heroes', [HeroController::class, 'store']);
	Route::put('/heroes/{hero}', [HeroController::class, 'update']);
	Route::apiResource('/features', FeatureController::class);
	Route::get('/about-hero', [AboutHeroController::class, 'index']);
	Route::post('/about-hero', [AboutHeroController::class, 'update']);
	Route::get('/about-story', [AboutStoryController::class, 'index']);
	Route::post('/about-story', [AboutStoryController::class, 'update']);
	Route::get('/about-mission', [AboutMissionController::class, 'index']);
	Route::post('/about-mission', [AboutMissionController::class, 'update']);
	Route::get('/about-giving-back', [AboutGivingBackController::class, 'index']);
	Route::post('/about-giving-back', [AboutGivingBackController::class, 'update']);
	Route::get('/about-fabric-technology', [AboutFabricTechnologyController::class, 'index']);
	Route::post('/about-fabric-technology', [AboutFabricTechnologyController::class, 'update']);

	// Sustainability Longivity
	Route::get('/sustainability-longivity', [App\Http\Controllers\SustainabilityLongivityController::class, 'index']);
	Route::post('/sustainability-longivity', [App\Http\Controllers\SustainabilityLongivityController::class, 'store']);
	Route::get('/sustainability-longivity/{sustainabilityLongivity}', [App\Http\Controllers\SustainabilityLongivityController::class, 'show']);
	Route::put('/sustainability-longivity/{sustainabilityLongivity}', [App\Http\Controllers\SustainabilityLongivityController::class, 'update']);
	Route::delete('/sustainability-longivity/{sustainabilityLongivity}', [App\Http\Controllers\SustainabilityLongivityController::class, 'destroy']);

	// Community Page Sections

	Route::get('/community-page-sections', [CommunityPageSectionController::class, 'index']);
	Route::post('/community-page-sections', [CommunityPageSectionController::class, 'store']);
	Route::post('/community-page-sections/upload-feature-image', [CommunityPageSectionController::class, 'uploadFeatureImage']);
	Route::get('/community-page-sections/{key}', [CommunityPageSectionController::class, 'show']);
	Route::delete('/community-page-sections/{key}', [CommunityPageSectionController::class, 'destroy']);

	Route::get('/collections', [CollectionController::class, 'index']);
	Route::put('/collections', [CollectionController::class, 'update']);

	Route::get('/our-story', [OurStorySectionController::class, 'index']);
	Route::post('/our-story', [OurStorySectionController::class, 'update']);
	Route::get('/home-background-section', [HomeBackgroundSectionController::class, 'index']);
	Route::post('/home-background-section', [HomeBackgroundSectionController::class, 'update']);

	Route::apiResource('/categories', CategoryController::class);
	Route::apiResource('/sub-categories', SubCategoryController::class);
	Route::put('/grand-childs/reorder', [GrandChildController::class, 'reorder']);
	Route::apiResource('/grand-childs', GrandChildController::class);

	Route::get('/inventory/canada-warehouse-stocks', [CanadaWarehouseStockController::class, 'index']);

	Route::get('/api-products', [ApiProductController::class, 'index']);
	Route::post('/api-products/sync', [ApiProductController::class, 'sync']);

	Route::apiResource('/settings', SettingsController::class);
	Route::get('/website/best-sellers-section', [SettingsController::class, 'bestSellersSection']);
	Route::put('/website/best-sellers-section', [SettingsController::class, 'updateBestSellersSection']);

	Route::get('/products', [ProductController::class, 'index']);
	Route::put('/products/reorder', [ProductController::class, 'reorder']);
	Route::get('/products/{product}', [ProductController::class, 'show']);
	Route::post('/products', [ProductController::class, 'store']);
	Route::put('/products/{product}', [ProductController::class, 'update']);
	Route::patch('/products/{product}/toggle-status', [ProductController::class, 'toggleStatus']);
	Route::delete('/products/{product}', [ProductController::class, 'destroy']);

	// Order Management
	Route::get('/orders', [CheckoutOrderController::class, 'index']);
	Route::get('/orders/{checkoutOrder}', [CheckoutOrderController::class, 'show']);
	Route::put('/orders/{checkoutOrder}', [CheckoutOrderController::class, 'update']);
	Route::delete('/orders/{checkoutOrder}', [CheckoutOrderController::class, 'destroy']);
	Route::post('/orders/bulk-update', [CheckoutOrderController::class, 'bulkUpdate']);
	Route::post('/orders/bulk-delete', [CheckoutOrderController::class, 'bulkDelete']);

	// JOOR Order Management
	Route::get('/joor-orders', [JoorOrderController::class, 'index']);
	Route::get('/joor-orders/{id}/items', [JoorOrderController::class, 'items']);
	Route::post('/joor-orders', [JoorOrderController::class, 'store']);
	Route::put('/joor-orders/{id}', [JoorOrderController::class, 'update']);

	// Public API Key Management
	Route::get('/public-api-keys', [PublicApiKeyController::class, 'index']);
	Route::post('/public-api-keys', [PublicApiKeyController::class, 'store']);
	Route::delete('/public-api-keys/{publicApiKey}', [PublicApiKeyController::class, 'destroy']);

	// Compliance Management
	Route::apiResource('/compliance', \App\Http\Controllers\CompliancePageController::class);
	});
	
});


Route::middleware('auth:sanctum')->prefix('external')->group(function () {
	Route::get('/orders-feed', [CheckoutOrderController::class, 'externalIndex']);
    Route::get('/orders/{checkoutOrder}', [CheckoutOrderController::class, 'externalShow']);
});