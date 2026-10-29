// Keeps the shop catalog's API data for the browser session, so the shop renders
// instantly from the last copy while a fresh copy loads in the background.
export const SHOP_PRODUCTS_ENDPOINT = '/api/public/shop-products';

const STORAGE_PREFIX = 'shop-data:';
const inFlight = new Map();

function endpointsFor(productsEndpoint) {
    return [
        '/api/public/sizes',
        '/api/public/categories',
        '/api/public/sub-categories',
        '/api/public/grand-childs',
        productsEndpoint,
        '/api/public/collections',
        '/api/public/colors',
    ];
}

// Returns { payloads, raw } in the order of endpointsFor(), or null.
export function readCachedShopData(productsEndpoint = SHOP_PRODUCTS_ENDPOINT) {
    try {
        const raw = sessionStorage.getItem(STORAGE_PREFIX + productsEndpoint);
        return raw ? { payloads: JSON.parse(raw), raw } : null;
    } catch {
        return null;
    }
}

// Fetches every payload (a failed response becomes []), sharing one request per endpoint set.
export function fetchShopData(productsEndpoint = SHOP_PRODUCTS_ENDPOINT) {
    if (inFlight.has(productsEndpoint)) {
        return inFlight.get(productsEndpoint);
    }

    const request = Promise.all(
        endpointsFor(productsEndpoint).map((url) => fetch(url, { headers: { Accept: 'application/json' } })),
    )
        .then(async (responses) => {
            const payloads = await Promise.all(responses.map((response) => (response.ok ? response.json() : [])));
            const raw = JSON.stringify(payloads);

            // Only remember complete data, so a temporary error isn't shown on the next visit
            if (responses.every((response) => response.ok)) {
                try {
                    sessionStorage.setItem(STORAGE_PREFIX + productsEndpoint, raw);
                } catch {
                    // Storage full or blocked: the page still works, just without the instant reload
                }
            }

            return { payloads, raw };
        })
        .finally(() => inFlight.delete(productsEndpoint));

    inFlight.set(productsEndpoint, request);
    return request;
}

// Warm the cache before the visitor opens the shop.
export function prefetchShopData() {
    if (!readCachedShopData() && !inFlight.has(SHOP_PRODUCTS_ENDPOINT)) {
        fetchShopData().catch(() => {});
    }
}
