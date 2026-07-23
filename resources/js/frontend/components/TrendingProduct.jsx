import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { timelessFontClass } from '../utils/typography';
import { sectionTypography } from '../utils/sectionTypography';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { ChevronLeft, ChevronRight, Eye, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '../context/CartContext';
import ProductVariantModal from './ProductVariantModal.jsx';

const FALLBACK_IMAGE = '/uploads/heroes/images/hero1.webp';

/* ─── utility helpers ─── */

function toAbsoluteImageUrl(path) {
    if (!path || typeof path !== 'string') return FALLBACK_IMAGE;
    if (path.startsWith('http')) return path;
    return `/${path.replace(/^\/+/, '')}`;
}

function normalizeImageKey(path) {
    if (!path || typeof path !== 'string') return '';
    return path.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '').trim();
}

function parseList(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim().replace(/^[\[\]"']+|[\[\]"']+$/g, '')).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
        const raw = value.trim();
        if ((raw.startsWith('[') && raw.endsWith(']')) || (raw.startsWith('"') && raw.endsWith('"'))) {
            try {
                const parsed = JSON.parse(raw);
                return parseList(parsed);
            } catch {}
        }
        return raw.split(',').map((item) => item.trim().replace(/^[\[\]"']+|[\[\]"']+$/g, '')).filter(Boolean);
    }
    return [];
}

function normalizeQueryValue(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeColorLookupEntry(record) {
    if (!record || typeof record !== 'object') return null;
    const name = String(record.name || '').trim();
    const colorCode = String(record.color_code || '').trim();
    if (!name || !/^#[0-9a-f]{6}$/i.test(colorCode)) return null;
    return [name.toLowerCase(), colorCode];
}

function normalizeColorNameLookupEntry(record) {
    if (!record || typeof record !== 'object') return null;
    const id = String(record.id ?? '').trim();
    const name = String(record.name || '').trim();
    if (!id || !name) return null;
    return [id, name];
}

function resolveColorDisplayName(value, colorNameLookup = {}) {
    const token = String(value || '').trim().replace(/^"+|"+$/g, '');
    if (!token) return '';
    return colorNameLookup[token] || token;
}

function normalizeProductColors(value, colorNameLookup = {}) {
    return parseList(value).map((item) => resolveColorDisplayName(item, colorNameLookup)).filter(Boolean);
}

function getSwatchColor(value, colorLookup = {}) {
    if (typeof value !== 'string') return '#d4d4d8';
    const trimmed = value.trim();
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
    const mapped = colorLookup[trimmed.toLowerCase()];
    if (mapped) return mapped;
    if (/^[a-z]+$/i.test(trimmed)) return trimmed.toLowerCase();
    return '#d4d4d8';
}

function getProductStock(product) {
    if (Number.isFinite(Number(product?.stock))) return Number(product.stock);
    const variants = Array.isArray(product?.variant_rows) ? product.variant_rows : [];
    return variants.reduce((total, row) => {
        const next = Number(row?.stock);
        return Number.isFinite(next) ? total + next : total;
    }, 0);
}

function collectVariantImages(product) {
    const images = [];
    if (product?.cover_image) images.push(product.cover_image);
    if (Array.isArray(product?.image_gallery)) images.push(...product.image_gallery.filter(Boolean));
    if (product?.color_variant_images && typeof product.color_variant_images === 'object') {
        Object.values(product.color_variant_images).forEach((items) => {
            if (Array.isArray(items)) images.push(...items.filter(Boolean));
        });
    }
    return images;
}

function buildVariantRowKey(row = {}) {
    const color = String(row?.color || '').trim().toLowerCase();
    const size = String(row?.size || '').trim().toLowerCase();
    const sku = String(row?.sku || '').trim().toLowerCase();
    if (sku) return `sku:${sku}`;
    return `${color}__${size}`;
}

function isBundleLikeProduct(product) {
    const name = String(product?.name || '').trim().toLowerCase();
    const sku = String(product?.sku || '').trim().toLowerCase();
    return name.includes('bundle') || sku.includes('bundle');
}

function isVariantTrending(product, seedColor = '') {
    if (!product || typeof product !== 'object') return false;
    const rows = Array.isArray(product.variant_rows) ? product.variant_rows : [];
    if (rows.length === 0) return false;
    const normalizedSeed = normalizeQueryValue(String(seedColor || ''));
    if (normalizedSeed) {
        return rows.some((row) =>
            normalizeQueryValue(String(row?.color || '')) === normalizedSeed &&
            (row?.show_on_best_sellers === true || Number(row?.show_on_best_sellers) === 1)
        );
    }
    return rows.some((row) => row?.show_on_best_sellers === true || Number(row?.show_on_best_sellers) === 1);
}

function groupProductsByName(products, colorNameLookup = {}) {
    const grouped = new Map();
    products.forEach((product, index) => {
        const name = String(product?.name || '').trim();
        const key = name.toLowerCase() || `unnamed-${product?.id ?? index}`;
        const existing = grouped.get(key);
        const productColors = normalizeProductColors(product?.color, colorNameLookup);
        const productImages = collectVariantImages(product);
        const directVariantImages =
            product?.color_variant_images && typeof product.color_variant_images === 'object'
                ? Object.fromEntries(
                    Object.entries(product.color_variant_images).map(([k, images]) => [resolveColorDisplayName(k, colorNameLookup), images])
                )
                : {};
        const productVariants = Array.isArray(product?.variant_rows) ? product.variant_rows : [];

        if (!existing) {
            grouped.set(key, {
                ...product,
                color: [...new Set(productColors)],
                image_gallery: [...new Set(Array.isArray(product?.image_gallery) ? product.image_gallery.filter(Boolean) : [])],
                color_variant_images: {},
                variant_rows: [...productVariants],
            });
        }
        const target = grouped.get(key);
        const mergedColors = new Set(normalizeProductColors(target.color, colorNameLookup));
        productColors.forEach((c) => mergedColors.add(c));
        target.color = [...mergedColors];
        const mergedGallery = new Set(Array.isArray(target.image_gallery) ? target.image_gallery.filter(Boolean) : []);
        productImages.forEach((img) => mergedGallery.add(img));
        target.image_gallery = [...mergedGallery];
        if (!target.cover_image && product?.cover_image) target.cover_image = product.cover_image;
        const variantMap = { ...(target.color_variant_images && typeof target.color_variant_images === 'object' ? target.color_variant_images : {}) };
        productColors.forEach((color) => {
            const mappedImages = Array.isArray(directVariantImages[color]) ? directVariantImages[color].filter(Boolean) : [];
            const fallbackImages = mappedImages.length > 0 ? mappedImages : productImages;
            const merged = new Set(Array.isArray(variantMap[color]) ? variantMap[color].filter(Boolean) : []);
            fallbackImages.forEach((img) => merged.add(img));
            if (merged.size > 0) variantMap[color] = [...merged];
        });
        target.color_variant_images = variantMap;
        const mergedVariants = new Map(
            (Array.isArray(target.variant_rows) ? target.variant_rows : []).map((row) => [buildVariantRowKey(row), row])
        );
        productVariants.forEach((row) => {
            const rowKey = buildVariantRowKey(row);
            if (!mergedVariants.has(rowKey)) mergedVariants.set(rowKey, row);
        });
        target.variant_rows = [...mergedVariants.values()];
        target.stockValue = getProductStock(target);
    });
    return [...grouped.values()];
}

function createVariantCardId(product, color, index) {
    const baseId = String(product?.id ?? `product-${index}`).trim();
    const colorSlug = String(color || 'default').trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `${baseId}__${colorSlug || 'default'}__${index}`;
}

function expandProductsByColorVariants(products) {
    if (!Array.isArray(products)) return [];
    return products.flatMap((product, productIndex) => {
        if (isBundleLikeProduct(product)) {
            return [{ ...product, variant_seed_color: null, base_product_id: product?.id ?? productIndex, tag: isVariantTrending(product) ? 'Trending' : null }];
        }
        const colors = normalizeProductColors(product?.color);
        if (colors.length === 0) {
            return [{ ...product, variant_seed_color: null, tag: isVariantTrending(product) ? 'Trending' : null }];
        }
        return colors.map((color, colorIndex) => ({
            ...product,
            id: createVariantCardId(product, color, colorIndex),
            variant_seed_color: color,
            base_product_id: product?.id ?? productIndex,
            tag: isVariantTrending(product, color) ? 'Trending' : null,
        }));
    });
}

function normalizeProducts(payload, colorNameLookup = {}) {
    if (!Array.isArray(payload)) return [];
    const normalized = payload.map((item, index) => {
        const normalizedColorVariantImages =
            item?.color_variant_images && typeof item.color_variant_images === 'object'
                ? Object.fromEntries(
                    Object.entries(item.color_variant_images).map(([key, images]) => [resolveColorDisplayName(key, colorNameLookup), images])
                )
                : {};
        const normalizedVariantRows = Array.isArray(item?.variant_rows)
            ? item.variant_rows.map((row) => ({ ...row, color: resolveColorDisplayName(row?.color, colorNameLookup) }))
            : [];
        return {
            ...item,
            id: item?.id ?? `product-${index}`,
            name: String(item?.name || '').trim() || 'Untitled Product',
            priceValue: Number(item?.price) || 0,
            price: `$${(Number(item?.price) || 0).toFixed(2)}`,
            cover_image: item?.cover_image || null,
            image_gallery: Array.isArray(item?.image_gallery) ? item.image_gallery : [],
            color: normalizeProductColors(item?.color, colorNameLookup),
            color_variant_images: normalizedColorVariantImages,
            variant_rows: normalizedVariantRows,
            stockValue: getProductStock(item),
            tag: null,
        };
    });
    return expandProductsByColorVariants(groupProductsByName(normalized, colorNameLookup));
}

/* ─── Fallback data ─── */

const FALLBACK_PRODUCTS = [
    { id: 1, name: 'Timeless Piece 1', priceValue: 59, slug: 'timeless-piece-1' },
    { id: 2, name: 'Timeless Piece 2', priceValue: 69, slug: 'timeless-piece-2' },
    { id: 3, name: 'Timeless Piece 3', priceValue: 79, slug: 'timeless-piece-3' },
    { id: 4, name: 'Timeless Piece 4', priceValue: 89, slug: 'timeless-piece-4' },
    { id: 5, name: 'Timeless Piece 5', priceValue: 99, slug: 'timeless-piece-5' },
];

/* ─── ColorSwatch ─── */

function ColorSwatch({ color, active, onClick, colorLookup, colorNameLookup = {} }) {
    const displayColor = resolveColorDisplayName(color, colorNameLookup);
    return (
        <button
            type="button"
            title={displayColor}
            onClick={onClick}
            className={`inline-block size-5 rounded-full border shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] transition-transform hover:scale-110 sm:size-[1.35rem] ${
                active ? 'border-zinc-900 ring-1 ring-zinc-900/25' : 'border-zinc-200'
            }`}
            style={{ backgroundColor: getSwatchColor(displayColor, colorLookup) }}
        />
    );
}

/* ─── ProductCard (enhanced with swatches, image nav, hover CTAs) ─── */

function ProductCard({ product, colorLookup = {}, colorNameLookup = {}, onAddToCart }) {
    const navigate = useNavigate();
    const colors = useMemo(() => {
        const normalized = normalizeProductColors(product.color);
        const seededColor = String(product?.variant_seed_color || '').trim();
        if (!seededColor) return normalized;
        // Show all available colors while using variant_seed_color as the initial/default
        return normalized.includes(seededColor) ? normalized : [seededColor, ...normalized];
    }, [product.color, product?.variant_seed_color]);

    const galleryImages = useMemo(() => {
        const rawGallery = Array.isArray(product.image_gallery) ? product.image_gallery : [];
        const allCandidates = [product.cover_image, ...rawGallery].filter(Boolean);
        const seen = new Set();
        const deduped = [];
        allCandidates.forEach((item) => {
            const key = normalizeImageKey(item);
            if (!key || seen.has(key)) return;
            seen.add(key);
            deduped.push(item);
        });
        if (deduped.length === 0) return [FALLBACK_IMAGE];
        return deduped.map((item) => toAbsoluteImageUrl(item));
    }, [product.cover_image, product.image_gallery]);

    const colorVariantImages =
        product.color_variant_images && typeof product.color_variant_images === 'object'
            ? product.color_variant_images
            : {};

    const initialSeedColor = useMemo(() => {
        const seededColor = String(product?.variant_seed_color || '').trim();
        if (seededColor && colors.includes(seededColor)) return seededColor;
        return colors[0] || null;
    }, [product?.variant_seed_color, colors]);

    const initialImageIndex = useMemo(() => {
        if (!initialSeedColor) return 0;
        const mappedImages = Array.isArray(colorVariantImages[initialSeedColor]) ? colorVariantImages[initialSeedColor] : [];
        if (mappedImages.length === 0) return 0;
        const targetIndex = galleryImages.findIndex((image) => normalizeImageKey(image) === normalizeImageKey(mappedImages[0]));
        return targetIndex >= 0 ? targetIndex : 0;
    }, [initialSeedColor, colorVariantImages, galleryImages]);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [selectedColor, setSelectedColor] = useState(() => initialSeedColor);

    useEffect(() => {
        setCurrentImageIndex(initialImageIndex);
        setSelectedColor(initialSeedColor);
    }, [product.id, product.color, initialImageIndex, initialSeedColor]);

    useEffect(() => {
        const currentImage = galleryImages[currentImageIndex];
        if (!currentImage) return;
        const currentImageKey = normalizeImageKey(currentImage);
        if (!currentImageKey) return;
        const matchedColor = colors.find((color) => {
            const mappedImages = Array.isArray(colorVariantImages[color]) ? colorVariantImages[color] : [];
            return mappedImages.some((image) => normalizeImageKey(image) === currentImageKey);
        });
        if (matchedColor && matchedColor !== selectedColor) setSelectedColor(matchedColor);
    }, [currentImageIndex, galleryImages, colors, colorVariantImages, selectedColor]);

    const imageSrc = galleryImages[currentImageIndex] || FALLBACK_IMAGE;

    function handlePrevImage(event) {
        event.preventDefault();
        event.stopPropagation();
        setCurrentImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
    }

    function handleNextImage(event) {
        event.preventDefault();
        event.stopPropagation();
        setCurrentImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
    }

    function handleSelectColor(color, event) {
        event.preventDefault();
        event.stopPropagation();
        setSelectedColor(color);
        const mappedImages = Array.isArray(colorVariantImages[color]) ? colorVariantImages[color] : [];
        if (mappedImages.length === 0) return;
        const firstMapped = mappedImages[0];
        const targetIndex = galleryImages.findIndex((image) => normalizeImageKey(image) === normalizeImageKey(firstMapped));
        if (targetIndex >= 0) setCurrentImageIndex(targetIndex);
    }

    const productSlug = String(product?.slug || '').trim();
    const productName = String(product?.name || '').trim();
    const productLink = useMemo(() => {
        const base = productSlug
            ? `/product-details/${encodeURIComponent(productSlug)}`
            : `/product-details/${encodeURIComponent(productName)}`;
        const colorValue = String(selectedColor || '').trim();
        if (!colorValue) return base;
        return `${base}/${encodeURIComponent(colorValue)}`;
    }, [productSlug, productName, selectedColor]);

    function handleAddToCart(event) {
        event.preventDefault();
        event.stopPropagation();
        onAddToCart?.(product, { selectedColor, quantity: 1, image: imageSrc });
    }

    function handleQuickView(event) {
        event.preventDefault();
        event.stopPropagation();
        navigate(productLink);
    }

    function handleWishlist(event) {
        event.preventDefault();
        event.stopPropagation();
        toast.info('Wishlist will be available soon');
    }

    return (
        <article className="group mx-auto w-full max-w-[315px] overflow-hidden border border-zinc-200">
            <Link to={productLink} className="block">
                <div className="relative h-[400px] overflow-hidden bg-zinc-100">
                    <img
                        src={imageSrc}
                        alt={product.name}
                        className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Hover action buttons */}
                    <div className="product-hover-cta absolute inset-x-3 bottom-3 flex translate-y-3 items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <button
                            type="button"
                            onClick={handleAddToCart}
                            className="inline-flex h-9 items-center justify-center bg-zinc-900 px-4 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-zinc-800"
                        >
                            Add to cart
                        </button>
                        <button
                            type="button"
                            onClick={handleWishlist}
                            aria-label="Add to wishlist"
                            className="inline-flex size-9 items-center justify-center border border-zinc-200 text-zinc-700 transition-colors duration-200 hover:text-zinc-950"
                        >
                            <Heart className="size-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleQuickView}
                            aria-label="Preview product"
                            className="inline-flex size-9 items-center justify-center border border-zinc-200 text-zinc-700 transition-colors duration-200 hover:text-zinc-950"
                        >
                            <Eye className="size-4" />
                        </button>
                    </div>

                    {/* Trending badge */}
                    {product.tag ? (
                        <span className="absolute left-3 top-3 bg-zinc-950 px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white">
                            {product.tag}
                        </span>
                    ) : null}

                    {/* Image nav arrows */}
                    {galleryImages.length > 1 ? (
                        <>
                            <button
                                type="button"
                                aria-label="Previous image"
                                onClick={handlePrevImage}
                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-zinc-800 opacity-0 shadow transition-opacity group-hover:opacity-100"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                            <button
                                type="button"
                                aria-label="Next image"
                                onClick={handleNextImage}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-zinc-800 opacity-0 shadow transition-opacity group-hover:opacity-100"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </>
                    ) : null}
                </div>
            </Link>

            <div className="space-y-1 p-4 pt-3.5">
                {/* Color swatches */}
                {colors.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        {colors.slice(0, 6).map((c, i) => (
                            <ColorSwatch
                                key={`${c}-${i}`}
                                color={c}
                                active={selectedColor === c}
                                colorLookup={colorLookup}
                                colorNameLookup={colorNameLookup}
                                onClick={(event) => handleSelectColor(c, event)}
                            />
                        ))}
                    </div>
                )}

                <Link to={productLink} className="block">
                    <h3 className={`${sectionTypography.productName} line-clamp-2 text-[0.95rem] font-medium leading-[1.15] text-zinc-900 transition-opacity hover:opacity-70 sm:text-[1.02rem]`}>
                        {product.name}
                    </h3>
                </Link>

                <p className={`${sectionTypography.productPrice} text-[1.2rem] font-semibold leading-none text-zinc-800 sm:text-[.95rem]`}>
                    ${Number(product.priceValue).toFixed(2)}
                </p>
            </div>
        </article>
    );
}

/* ─── Main New Arrivals Section ─── */

export default function TrendingProduct() {
    const { addToCart, openCartDrawer } = useCart();
    const [products, setProducts] = useState(() => FALLBACK_PRODUCTS);
    const [colorLookup, setColorLookup] = useState({});
    const [colorNameLookup, setColorNameLookup] = useState({});
    const [variantModalState, setVariantModalState] = useState(null);

    useEffect(() => {
        let ignore = false;

        async function loadNewArrivals() {
            try {
                let nextColorLookup = {};
                let nextColorNameLookup = {};

                try {
                    const colorsRes = await fetch('/api/public/colors', { headers: { Accept: 'application/json' } });
                    if (colorsRes.ok) {
                        const colorsPayload = await colorsRes.json();
                        const colorList = Array.isArray(colorsPayload)
                            ? colorsPayload
                            : (Array.isArray(colorsPayload?.data) ? colorsPayload.data : []);
                        nextColorLookup = Object.fromEntries(colorList.map(normalizeColorLookupEntry).filter(Boolean));
                        nextColorNameLookup = Object.fromEntries(colorList.map(normalizeColorNameLookupEntry).filter(Boolean));
                    }
                } catch {}

                const response = await fetch('/api/public/new-arrivals', { headers: { Accept: 'application/json' } });
                if (!response.ok) return;
                const payload = await response.json();
                const list = Array.isArray(payload?.products) ? payload.products : Array.isArray(payload) ? payload : [];

                const normalized = normalizeProducts(list, nextColorNameLookup);

                if (!ignore && normalized.length > 0) {
                    setProducts(normalized);
                    setColorLookup(nextColorLookup);
                    setColorNameLookup(nextColorNameLookup);
                } else if (!ignore && list.length > 0) {
                    // fallback: simple mapping if normalization yields nothing
                    const mapped = list.map((p) => ({
                        id: p?.id ?? Math.random(),
                        name: String(p?.name || '').trim() || 'Product',
                        priceValue: Number(p?.price) || 0,
                        slug: String(p?.slug || '').trim(),
                        cover_image: p?.cover_image || null,
                        image_gallery: Array.isArray(p?.image_gallery) ? p.image_gallery : [],
                        color: normalizeProductColors(p?.color, nextColorNameLookup),
                        variant_seed_color: null,
                        tag: null,
                    }));
                    setProducts(mapped);
                    setColorLookup(nextColorLookup);
                    setColorNameLookup(nextColorNameLookup);
                }
            } catch {}
        }
        loadNewArrivals();
        return () => { ignore = true; };
    }, []);

    function handleAddToCart(product, options = {}) {
        setVariantModalState({ product, defaults: options });
    }

    function handleConfirmVariant(options = {}) {
        if (!variantModalState?.product) return;
        const nextItem = addToCart(variantModalState.product, options);
        setVariantModalState(null);
        toast.success(`${nextItem.name} added to cart`);
        openCartDrawer();
    }

    return (
        <motion.section
            className={`${timelessFontClass} pt-2 pb-8 overflow-hidden w-full`}
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
            <h3 className="mb-8 text-center font-serif text-4xl text-zinc-900">
                New Arrivals
            </h3>

            <div className="w-full">
                <Swiper
                    modules={[Navigation, Autoplay]}
                    navigation
                    loop={true}
                    speed={1400}
                    autoplay={{ delay: 4000, disableOnInteraction: false }}
                    spaceBetween={0}
                    slidesPerView={1.5}
                    breakpoints={{
                        640: { slidesPerView: 3 },
                        1024: { slidesPerView: 4 },
                        1280: { slidesPerView: 5 },
                    }}
                    className="px-0"
                >
                    {products.map((product, index) => (
                        <SwiperSlide key={product.id || index}>
                            <ProductCard
                                product={product}
                                colorLookup={colorLookup}
                                colorNameLookup={colorNameLookup}
                                onAddToCart={handleAddToCart}
                            />
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>

            {/* Variant modal for add-to-cart */}
            <ProductVariantModal
                isOpen={Boolean(variantModalState?.product)}
                product={variantModalState?.product || null}
                colorLookup={colorLookup}
                defaults={variantModalState?.defaults || {}}
                onClose={() => setVariantModalState(null)}
                onConfirm={handleConfirmVariant}
            />

            <style>{`
                .swiper-button-next, .swiper-button-prev { color: #000 !important; }
            `}</style>
        </motion.section>
    );
}
