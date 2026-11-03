import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const CART_STORAGE_KEY = 'frontend-cart-items-v1';
// Id of the logged-in customer whose saved cart the stored items mirror; absent for a guest cart.
const CART_OWNER_STORAGE_KEY = 'frontend-cart-owner-v1';
const CART_SYNC_DELAY_MS = 400;

const CartContext = createContext(null);

function readCookie(name) {
    const escapedName = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
}

function readStoredCart() {
    try {
        const parsed = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function readStoredCartOwner() {
    try {
        return window.localStorage.getItem(CART_OWNER_STORAGE_KEY) || '';
    } catch {
        return '';
    }
}

function writeStoredCartOwner(ownerId) {
    try {
        if (ownerId) {
            window.localStorage.setItem(CART_OWNER_STORAGE_KEY, ownerId);
        } else {
            window.localStorage.removeItem(CART_OWNER_STORAGE_KEY);
        }
    } catch {
        // Ignore persistence failures.
    }
}

function customerCartRequest(method, path, body, { keepalive = false } = {}) {
    const xsrfToken = readCookie('XSRF-TOKEN');

    return fetch(path, {
        method,
        credentials: 'include',
        keepalive,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
        },
        body,
    });
}

async function fetchLoggedInCustomer() {
    const response = await fetch('/api/user', {
        credentials: 'include',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (response.status === 401) {
        return null;
    }

    if (!response.ok) {
        throw new Error('Unable to resolve the logged-in user');
    }

    const user = await response.json().catch(() => null);
    return user?.user_type === 'customer' && user?.id ? user : null;
}

// Resolves { customerId, items } where items is the cart to show (null keeps the local cart),
// or null when the account state could not be determined.
async function resolveAccountCart(localItems) {
    const storedOwnerId = readStoredCartOwner();

    let customer;
    try {
        customer = await fetchLoggedInCustomer();
    } catch {
        return null;
    }

    if (!customer) {
        // The stored cart mirrors a customer who has logged out; it stays saved on their account.
        if (storedOwnerId) {
            writeStoredCartOwner('');
            return { customerId: '', items: [] };
        }

        return { customerId: '', items: null };
    }

    const customerId = String(customer.id);
    // A guest cart is added to the account; a cart already mirroring this account is refreshed from it.
    const guestItems = storedOwnerId ? [] : localItems;

    try {
        const response = guestItems.length > 0
            ? await customerCartRequest('POST', '/api/customer/cart/merge', JSON.stringify({ items: guestItems }))
            : await customerCartRequest('GET', '/api/customer/cart');

        const payload = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(payload?.items)) {
            return null;
        }

        writeStoredCartOwner(customerId);
        return { customerId, items: payload.items };
    } catch {
        return null;
    }
}

// Shared across mounts so StrictMode's double-run effect cannot merge the guest cart twice.
let pendingAccountCart = null;

function toNumberPrice(value) {
    if (Number.isFinite(Number(value))) {
        return Number(value);
    }

    if (typeof value === 'string') {
        const parsed = Number(value.replace(/[^0-9.\-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

// Variant rows may store color/size as raw IDs (e.g. from the shop/product-details pages) while the
// selected color/size shown to the user is always the display name. Resolve both sides to display
// names before comparing, otherwise the variant weight never matches and silently disappears.
function resolveDisplayName(value, idToNameMap = {}) {
    const token = String(value ?? '').trim();
    if (!token) {
        return '';
    }

    return idToNameMap[token] ?? idToNameMap[token.toLowerCase()] ?? token;
}

function resolveVariantWeight(product, selectedColor = '', selectedSize = '', colorNameById = {}, sizeNameById = {}) {
    const rows = Array.isArray(product?.variant_rows) ? product.variant_rows : [];
    if (!rows.length) {
        const fallbackValue = Number(product?.weight ?? 0);
        return Number.isFinite(fallbackValue) && fallbackValue > 0 ? fallbackValue : null;
    }

    const normalizeValue = (value) => String(value ?? '').trim().toLowerCase();
    const normalizedColor = normalizeValue(resolveDisplayName(selectedColor, colorNameById));
    const normalizedSize = normalizeValue(resolveDisplayName(selectedSize, sizeNameById));

    const getRowWeight = (row) => {
        const value = Number(row?.weight ?? row?.Weight ?? product?.weight ?? 0);
        return Number.isFinite(value) && value > 0 ? value : null;
    };

    const rowColorName = (row) => normalizeValue(resolveDisplayName(row?.color, colorNameById));
    const rowSizeName = (row) => normalizeValue(resolveDisplayName(row?.size, sizeNameById));

    const exactMatch = rows.find((row) => {
        if (!row || typeof row !== 'object') {
            return false;
        }

        const rowColor = rowColorName(row);
        const rowSize = rowSizeName(row);
        const rowKey = normalizeValue(row.key);

        const colorMatches = !normalizedColor || rowColor === normalizedColor || rowColor.includes(normalizedColor) || rowKey.includes(normalizedColor);
        const sizeMatches = !normalizedSize || rowSize === normalizedSize || rowSize.includes(normalizedSize) || rowKey.includes(normalizedSize);

        return colorMatches && sizeMatches;
    });

    const exactWeight = getRowWeight(exactMatch);
    if (exactWeight !== null) {
        return exactWeight;
    }

    if (normalizedSize) {
        const sizeMatch = rows.find((row) => {
            if (!row || typeof row !== 'object') {
                return false;
            }

            const rowSize = rowSizeName(row);
            const rowKey = normalizeValue(row.key);
            return rowSize === normalizedSize || rowSize.includes(normalizedSize) || rowKey.includes(normalizedSize);
        });

        const sizeWeight = getRowWeight(sizeMatch);
        if (sizeWeight !== null) {
            return sizeWeight;
        }
    }

    if (normalizedColor) {
        const colorMatch = rows.find((row) => {
            if (!row || typeof row !== 'object') {
                return false;
            }

            const rowColor = rowColorName(row);
            const rowKey = normalizeValue(row.key);
            return rowColor === normalizedColor || rowColor.includes(normalizedColor) || rowKey.includes(normalizedColor);
        });

        const colorWeight = getRowWeight(colorMatch);
        if (colorWeight !== null) {
            return colorWeight;
        }
    }

    const fallbackValue = Number(product?.weight ?? 0);
    return Number.isFinite(fallbackValue) && fallbackValue > 0 ? fallbackValue : null;
}

function normalizeCartItem(product, options = {}, colorNameById = {}, sizeNameById = {}) {
    const productId = String(product?.id || product?.slug || product?.name || Date.now());
    const selectedColor = String(options.selectedColor || '').trim();
    const selectedSize = String(options.selectedSize || '').trim();
    const quantity = Math.max(1, Number(options.quantity) || 1);

    const lineId = [productId, selectedColor || 'default-color', selectedSize || 'default-size'].join('::');

    const image = options.image
        || product?.cover_image
        || (Array.isArray(product?.image_gallery) ? product.image_gallery[0] : '')
        || '';

    const normalizedImage =
        typeof image === 'string' && image
            ? (image.startsWith('http') || image.startsWith('/') ? image : `/${image.replace(/^\/+/, '')}`)
            : '';

    const priceValue = toNumberPrice(product?.priceValue ?? product?.price);
    const resolvedWeight = resolveVariantWeight(product, selectedColor, selectedSize, colorNameById, sizeNameById);

    return {
        lineId,
        productId,
        name: String(product?.name || 'Product').trim() || 'Product',
        priceValue,
        priceLabel: `$${priceValue.toFixed(2)}`,
        image: normalizedImage,
        quantity,
        selectedColor,
        selectedSize,
        slug: String(product?.slug || '').trim(),
        weight: Number.isFinite(Number(resolvedWeight)) ? Number(resolvedWeight) : null,
        length: Number(product?.length) || null,
        width: Number(product?.width) || null,
        height: Number(product?.height) || null,
    };
}

export function CartProvider({ children }) {
    const [items, setItems] = useState(readStoredCart);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [colorNameById, setColorNameById] = useState({});
    const [sizeNameById, setSizeNameById] = useState({});
    // Customer id whose saved cart is loaded; cart changes are only synced to the server while set.
    const [syncedCustomerId, setSyncedCustomerId] = useState('');
    const itemsRef = useRef(items);
    const lastSyncedBodyRef = useRef(null);
    const pendingSyncBodyRef = useRef(null);
    const syncQueueRef = useRef(Promise.resolve());

    useEffect(() => {
        let ignore = false;

        async function loadVariantLookups() {
            try {
                const [colorsResponse, sizesResponse] = await Promise.all([
                    fetch('/api/public/colors', { headers: { Accept: 'application/json' } }),
                    fetch('/api/public/sizes', { headers: { Accept: 'application/json' } }),
                ]);

                if (colorsResponse.ok) {
                    const payload = await colorsResponse.json();
                    const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
                    const nextLookup = {};
                    list.forEach((item) => {
                        const id = String(item?.id ?? '').trim();
                        const name = String(item?.name ?? '').trim();
                        if (id && name) {
                            nextLookup[id] = name;
                        }
                    });
                    if (!ignore) {
                        setColorNameById(nextLookup);
                    }
                }

                if (sizesResponse.ok) {
                    const payload = await sizesResponse.json();
                    const list = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []);
                    const nextLookup = {};
                    list.forEach((item) => {
                        const id = String(item?.id ?? '').trim();
                        const name = String(item?.size ?? item?.Size ?? '').trim();
                        if (id && name) {
                            nextLookup[id] = name;
                        }
                    });
                    if (!ignore) {
                        setSizeNameById(nextLookup);
                    }
                }
            } catch {
                // Weight resolution falls back to raw values when lookups are unavailable.
            }
        }

        loadVariantLookups();

        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        itemsRef.current = items;

        try {
            window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch {
            // Ignore persistence failures.
        }
    }, [items]);

    // Login and logout both reload the page, so the cart is reconciled with the account once per load.
    useEffect(() => {
        let ignore = false;

        pendingAccountCart ??= resolveAccountCart(itemsRef.current);
        pendingAccountCart.then((result) => {
            if (ignore) {
                return;
            }

            // A later remount reads the account again instead of reusing this result.
            pendingAccountCart = null;
            if (!result) {
                return;
            }

            if (result.items) {
                lastSyncedBodyRef.current = JSON.stringify({ items: result.items });
                setItems(result.items);
            }
            setSyncedCustomerId(result.customerId);
        });

        return () => {
            ignore = true;
        };
    }, []);

    function flushCartSync({ keepalive = false } = {}) {
        if (pendingSyncBodyRef.current === null) {
            return;
        }

        if (keepalive) {
            // The page is going away, so this cannot wait behind earlier requests.
            const body = pendingSyncBodyRef.current;
            pendingSyncBodyRef.current = null;
            customerCartRequest('PUT', '/api/customer/cart', body, { keepalive: true }).catch(() => {});
            return;
        }

        // Requests run one at a time so an older cart can never overwrite a newer one.
        syncQueueRef.current = syncQueueRef.current.then(async () => {
            const body = pendingSyncBodyRef.current;
            if (body === null) {
                return;
            }

            pendingSyncBodyRef.current = null;
            try {
                const response = await customerCartRequest('PUT', '/api/customer/cart', body);
                if (response.ok) {
                    lastSyncedBodyRef.current = body;
                }
            } catch {
                // The next cart change sends the full cart again.
            }
        });
    }

    useEffect(() => {
        if (!syncedCustomerId) {
            return undefined;
        }

        const body = JSON.stringify({ items });
        if (body === lastSyncedBodyRef.current) {
            return undefined;
        }

        pendingSyncBodyRef.current = body;
        const timer = setTimeout(() => flushCartSync(), CART_SYNC_DELAY_MS);
        return () => clearTimeout(timer);
    }, [items, syncedCustomerId]);

    useEffect(() => {
        const handlePageHide = () => flushCartSync({ keepalive: true });
        window.addEventListener('pagehide', handlePageHide);
        return () => window.removeEventListener('pagehide', handlePageHide);
    }, []);

    function addToCart(product, options = {}) {
        const nextItem = normalizeCartItem(product, options, colorNameById, sizeNameById);

        setItems((previous) => {
            const index = previous.findIndex((item) => item.lineId === nextItem.lineId);
            if (index < 0) {
                return [...previous, nextItem];
            }

            const updated = [...previous];
            updated[index] = {
                ...updated[index],
                quantity: updated[index].quantity + nextItem.quantity,
            };
            return updated;
        });

        return nextItem;
    }

    function removeFromCart(lineId) {
        setItems((previous) => previous.filter((item) => item.lineId !== lineId));
    }

    function updateQuantity(lineId, quantity) {
        const safeQuantity = Math.max(1, Number(quantity) || 1);
        setItems((previous) =>
            previous.map((item) =>
                item.lineId === lineId
                    ? { ...item, quantity: safeQuantity }
                    : item,
            ),
        );
    }

    function clearCart() {
        setItems([]);
    }

    function openCartDrawer() {
        setIsDrawerOpen(true);
    }

    function closeCartDrawer() {
        setIsDrawerOpen(false);
    }

    const itemCount = useMemo(
        () => items.reduce((total, item) => total + (Number(item.quantity) || 0), 0),
        [items],
    );

    const subtotal = useMemo(
        () => items.reduce((total, item) => total + (item.priceValue * item.quantity), 0),
        [items],
    );

    const value = useMemo(
        () => ({
            items,
            isDrawerOpen,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            openCartDrawer,
            closeCartDrawer,
            itemCount,
            subtotal,
        }),
        [items, isDrawerOpen, itemCount, subtotal],
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }

    return context;
}
