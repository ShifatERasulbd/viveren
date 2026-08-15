import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CART_STORAGE_KEY = 'frontend-cart-items-v1';

const CartContext = createContext(null);

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
    const [items, setItems] = useState([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [colorNameById, setColorNameById] = useState({});
    const [sizeNameById, setSizeNameById] = useState({});

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
        try {
            const raw = window.localStorage.getItem(CART_STORAGE_KEY);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                setItems(parsed);
            }
        } catch {
            // Keep empty cart when storage is unavailable.
        }
    }, []);

    useEffect(() => {
        try {
            window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch {
            // Ignore persistence failures.
        }
    }, [items]);

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
