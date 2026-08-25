import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { resolveProductFeatureIcon } from '../../shared/productFeatureIcons';

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='100%25' height='100%25' fill='%23eef0f3'/%3E%3C/svg%3E";

function RulerIcon() {
    return (
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path
                d="M6 18 18 6m-8 0 1.5 1.5M8 8l1.5 1.5m1.5-4.5L13 6.5m1.5-4.5L16 3.5M4.5 19.5l-1-1a1.4 1.4 0 0 1 0-2l11-11a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2l-11 11a1.4 1.4 0 0 1-2 0Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function resolveSwatchColor(value, colorLookup = {}) {
    const raw = String(value || '').trim();
    if (/^#[0-9a-f]{3,8}$/i.test(raw)) {
        return raw;
    }

    const mappedColor = colorLookup[raw.toLowerCase()] || colorLookup[raw];
    if (mappedColor && /^#[0-9a-f]{6}$/i.test(String(mappedColor))) {
        return mappedColor;
    }

    if (/^[a-z]+$/i.test(raw)) {
        return raw.toLowerCase();
    }

    return '#d4d4d8';
}

function parseColorTokens(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item ?? '').trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
        return value.split(',').map((item) => item.trim()).filter(Boolean);
    }

    return [];
}

function resolveComboColors(comboProduct, colorRecords = [], colorLookup = {}) {
    return parseColorTokens(comboProduct?.color).map((token) => {
        const record = colorRecords.find((item) => String(item?.id ?? '').trim() === token)
            || colorRecords.find((item) => String(item?.name ?? '').trim().toLowerCase() === token.toLowerCase());
        const label = record?.name || token;

        return { id: token, label, swatch: resolveSwatchColor(label, colorLookup) };
    });
}

function resolveComboVariantImage(comboProduct, matchedColor) {
    const mapping = comboProduct?.color_variant_images && typeof comboProduct.color_variant_images === 'object'
        ? comboProduct.color_variant_images
        : {};

    if (!matchedColor) {
        return '';
    }

    const candidateKeys = [matchedColor.id, matchedColor.label, matchedColor.label.toLowerCase()];
    for (const key of candidateKeys) {
        const images = mapping[key];
        if (Array.isArray(images) && images.length > 0) {
            return images[0];
        }
    }

    return '';
}

function toOptionalImageUrl(path) {
    if (!path || typeof path !== 'string') {
        return '';
    }

    const trimmed = path.trim();
    if (!trimmed) {
        return '';
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
        return trimmed;
    }

    return `/${trimmed.replace(/^\/+/, '')}`;
}

function normalizeProductFeatures(value) {
    if (Array.isArray(value)) {
        return value
            .filter((item) => item && typeof item === 'object')
            .map((item) => ({
                icon: String(item.icon || 'sparkles').trim() || 'sparkles',
                text: String(item.text || '').trim(),
            }))
            .filter((item) => item.text !== '');
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return [];
        }

        try {
            const decoded = JSON.parse(trimmed);
            if (Array.isArray(decoded)) {
                return normalizeProductFeatures(decoded);
            }
        } catch {
            return [];
        }
    }

    return [];
}

export default function SingleProductDetailsPanel({
    product,
    colorLookup,
    colorRecords = [],
    selectedColor,
    onSelectColor,
    selectedSize,
    onSelectSize,
    quantity,
    onDecreaseQuantity,
    onIncreaseQuantity,
    onAddToCart,
    comboProducts = [],
}) {
    const [openAccordionKey, setOpenAccordionKey] = useState('description');
    const [isSizeChartModalOpen, setIsSizeChartModalOpen] = useState(false);

    const displayColors = Array.isArray(product.colors) && product.colors.length > 0
        ? product.colors
        : [{ label: 'Default', value: '#d4d4d8' }];

    const displaySizes = Array.isArray(product.sizes) && product.sizes.length > 0
        ? product.sizes
        : ['One Size'];
    const selectedColorLabel = useMemo(() => {
        const match = displayColors.find(
            (color) => String(color.label || '').trim().toLowerCase() === String(selectedColor || '').trim().toLowerCase(),
        );

        return match?.label || String(selectedColor || '').trim() || 'Default';
    }, [displayColors, selectedColor]);

    const resolvedSizeChartImages = useMemo(() => {
        const mapping = product?.color_variant_size_charts && typeof product.color_variant_size_charts === 'object'
            ? product.color_variant_size_charts
            : {};
        const selected = String(selectedColor || '').trim();

        const selectedRecordByName = colorRecords.find(
            (record) => String(record?.name || '').trim().toLowerCase() === selected.toLowerCase(),
        );
        const selectedRecordById = colorRecords.find(
            (record) => String(record?.id || '').trim() === selected,
        );
        const matchedRecord = selectedRecordById || selectedRecordByName;

        const keys = [
            selected,
            selected.toLowerCase(),
            String(matchedRecord?.id || '').trim(),
            String(matchedRecord?.name || '').trim(),
            String(matchedRecord?.name || '').trim().toLowerCase(),
        ].filter(Boolean);

        const mappedItems = [];
        for (const key of keys) {
            const direct = mapping[key];
            if (Array.isArray(direct) && direct.length > 0) {
                mappedItems.push(...direct);
                continue;
            }

            const ciKey = Object.keys(mapping).find((itemKey) => itemKey.toLowerCase() === key.toLowerCase());
            if (ciKey && Array.isArray(mapping[ciKey]) && mapping[ciKey].length > 0) {
                mappedItems.push(...mapping[ciKey]);
            }
        }

        const normalizedMapped = [...new Set(mappedItems.map((item) => toOptionalImageUrl(item)).filter(Boolean))];
        return normalizedMapped;
    }, [product?.color_variant_size_charts, selectedColor, colorRecords]);

    const accordionItems = useMemo(() => {
        return [
            { key: 'description', title: 'Product Description', content: product?.description || '' },
            { key: 'fit', title: 'Fit', content: product?.fit || '' },
            { key: 'fabric', title: 'Fabric & Care', content: product?.fabric_and_care || '' },
            { key: 'composition', title: 'Product Composition', content: product?.product_composition || '' },
        ];
    }, [product]);

    const hasMultipleSizeCharts = resolvedSizeChartImages.length > 1;
    const normalizedProductFeatures = useMemo(
        () => normalizeProductFeatures(product?.product_features),
        [product?.product_features],
    );

    function toggleAccordionItem(key) {
        setOpenAccordionKey((previous) => (previous === key ? '' : key));
    }

    useEffect(() => {
        function handleEscape(event) {
            if (event.key === 'Escape') {
                setIsSizeChartModalOpen(false);
            }
        }

        const previousBodyOverflow = document.body.style.overflow;

        if (isSizeChartModalOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEscape);
        } else {
            document.body.style.overflow = previousBodyOverflow;
        }

        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = previousBodyOverflow;
        };
    }, [isSizeChartModalOpen]);

    return (
        <div className="px-2 py-1 sm:px-3">
            <div className="border-b border-zinc-200 pb-4">
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-zinc-900">New Now</p>
                <h1 className="mt-1 text-[2rem] font-semibold uppercase leading-[1.08] tracking-[0.02em] text-zinc-900 sm:text-[2.15rem]">
                    {product.name}
                </h1>
                <p className="mt-2 text-[1.15rem] font-medium leading-none text-zinc-900">{product.price}</p>
            </div>

            <div className="mt-5 space-y-5">
                <div>
                    <h2 className="text-[0.78rem] uppercase tracking-[0.08em] text-zinc-700">Color Variations</h2>
                    <div className="mt-2.5 pb-3">
                        <div className="flex items-center gap-2.5">
                        {displayColors.map((color) => (
                            <button
                                key={color.label}
                                type="button"
                                onClick={() => onSelectColor(color.label)}
                                aria-label={`Select ${color.label} color`}
                                className={`inline-flex size-10 items-center justify-center rounded-full border-2 ${
                                    selectedColor === color.label
                                        ? 'border-zinc-950'
                                        : 'border-zinc-200 hover:border-zinc-500'
                                }`}
                            >
                                <span
                                    className="size-7 rounded-full border border-zinc-300"
                                    style={{ backgroundColor: resolveSwatchColor(color.value, colorLookup) }}
                                />
                            </button>
                        ))}
                        </div>
                        <p className="mt-2 text-[0.82rem] font-medium uppercase tracking-[0.06em] text-zinc-700">
                            Selected: <span className="font-bold text-zinc-900">{selectedColorLabel}</span>
                        </p>
                    </div>
                </div>

                <div>
                    <h2 className="text-[0.78rem] uppercase tracking-[0.08em] text-zinc-700">Size Variations</h2>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                        {displaySizes.map((size) => (
                            <button
                                key={size}
                                type="button"
                                onClick={() => onSelectSize(size)}
                                className={`inline-flex h-[46px] min-w-[46px] items-center justify-center border px-3 text-[0.88rem] font-semibold uppercase tracking-[0.04em] transition-colors ${
                                    selectedSize === size
                                        ? 'border-zinc-950 bg-zinc-950 text-white'
                                        : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-600 hover:text-zinc-900'
                                }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (resolvedSizeChartImages.length > 0) {
                                setIsSizeChartModalOpen(true);
                            }
                        }}
                        className={`mt-3 inline-flex items-center gap-1.5 text-[0.88rem] font-semibold uppercase tracking-[0.05em] ${
                            resolvedSizeChartImages.length > 0
                                ? 'cursor-pointer text-zinc-800 hover:text-zinc-900'
                                : 'cursor-not-allowed text-zinc-400'
                        }`}
                        disabled={resolvedSizeChartImages.length === 0}
                    >
                        SIZE Chart <RulerIcon />
                    </button>
                </div>

                {comboProducts.length > 0 && (
                    <div>
                        <h2 className="text-[0.78rem] uppercase tracking-[0.08em] text-zinc-700">Combo Products</h2>
                        <div className="mt-2.5 flex flex-wrap gap-3">
                            {comboProducts.map((comboProduct) => {
                                const comboSlug = String(comboProduct?.slug || '').trim();
                                const comboName = String(comboProduct?.name || '').trim() || 'Product';
                                const comboGalleryImage = Array.isArray(comboProduct?.image_gallery)
                                    ? comboProduct.image_gallery.find((image) => typeof image === 'string' && image.trim())
                                    : '';
                                const comboColors = resolveComboColors(comboProduct, colorRecords, colorLookup);
                                const matchedComboColor = comboColors.find(
                                    (color) => color.label.trim().toLowerCase() === selectedColorLabel.trim().toLowerCase(),
                                );
                                const matchedVariantImage = resolveComboVariantImage(comboProduct, matchedComboColor);
                                const comboImage = toOptionalImageUrl(matchedVariantImage)
                                    || toOptionalImageUrl(comboProduct?.cover_image)
                                    || toOptionalImageUrl(comboGalleryImage)
                                    || PLACEHOLDER_IMAGE;
                                const comboLink = comboSlug
                                    ? `/product-details/${encodeURIComponent(comboSlug)}`
                                    : `/product-details/${encodeURIComponent(comboName)}`;

                                return (
                                    <Link
                                        key={comboProduct?.id ?? comboName}
                                        to={comboLink}
                                        className="flex w-[140px] flex-col gap-1.5 border border-zinc-200 p-2 transition-colors hover:border-zinc-400"
                                    >
                                        <span className="aspect-[3/4] w-full overflow-hidden bg-zinc-100">
                                            <img
                                                src={comboImage}
                                                alt={comboName}
                                                className="h-full w-full object-contain"
                                            />
                                        </span>
                                        {comboColors.length > 0 && (
                                            <span className="flex flex-wrap items-center gap-1">
                                                {comboColors.map((color, index) => (
                                                    <span
                                                        key={`${color.label}-${index}`}
                                                        title={color.label}
                                                        className={`size-3.5 rounded-full border ${
                                                            matchedComboColor && matchedComboColor.id === color.id
                                                                ? 'border-zinc-900 ring-1 ring-zinc-900/40'
                                                                : 'border-zinc-300'
                                                        }`}
                                                        style={{ backgroundColor: color.swatch }}
                                                    />
                                                ))}
                                            </span>
                                        )}
                                        <span className="line-clamp-2 text-[0.8rem] font-medium leading-tight text-zinc-900">
                                            {comboName}
                                        </span>
                                        <span className="text-[0.8rem] font-semibold text-zinc-700">
                                            ${Number(comboProduct?.price || 0).toFixed(2)}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2.5">
                    <div className="inline-flex h-[52px] border border-zinc-300">
                        <button
                            type="button"
                            onClick={onDecreaseQuantity}
                            className="inline-flex w-[42px] items-center justify-center text-[1.2rem] text-zinc-700"
                        >
                            -
                        </button>
                        <span className="inline-flex w-[42px] items-center justify-center border-x border-zinc-300 text-[1.1rem] text-zinc-900">
                            {quantity}
                        </span>
                        <button
                            type="button"
                            onClick={onIncreaseQuantity}
                            className="inline-flex w-[42px] items-center justify-center text-[1.2rem] text-zinc-700"
                        >
                            +
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onAddToCart}
                        className="inline-flex h-[52px] min-w-0 flex-1 cursor-pointer items-center justify-center bg-zinc-900 px-4 text-[0.92rem] font-semibold uppercase tracking-[0.05em] text-white transition-colors duration-200 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                    >
                        Add
                    </button>

                   
                </div>

             

                <p className="text-[0.82rem] uppercase tracking-[0.04em] text-zinc-500">Free delivery to store</p>

                {/* Clean Product Features Grid without Background Card Wrapper */}
                {normalizedProductFeatures.length > 0 ? (
                    <div>
                        <h3 className="text-[0.75rem] tracking-[0.08em] uppercase text-zinc-800">
                            Product Features
                        </h3>
                        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                            {normalizedProductFeatures.map((feature, index) => {
                                const Icon = resolveProductFeatureIcon(feature.icon);
                                return (
                                    <div key={`${feature.icon}-${index}`} className="font-monstrate flex items-start gap-2.5 text-[0.88rem] leading-5 text-zinc-700">
                                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700">
                                            <Icon className="size-3.5" />
                                        </span>
                                        <span>{feature.text}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                <div className="mt-1 border-y border-zinc-200">
                    {accordionItems.map((item) => {
                        const isOpen = openAccordionKey === item.key;
                        const hasContent = String(item.content || '').trim() !== '';

                        return (
                            <div key={item.key} className="border-b border-zinc-200 last:border-b-0">
                                <button
                                    type="button"
                                    onClick={() => toggleAccordionItem(item.key)}
                                    className="flex w-full items-center justify-between py-4 text-left text-[0.98rem] font-medium text-zinc-800"
                                    aria-expanded={isOpen}
                                >
                                    <span>{item.title}</span>
                                    <span className="text-[1.2rem] leading-none text-zinc-500">{isOpen ? '-' : '+'}</span>
                                </button>

                                {isOpen ? (
                                    hasContent ? (
                                        <div
                                            className="pb-4 text-[1rem] leading-9 text-zinc-600"
                                            dangerouslySetInnerHTML={{ __html: item.content }}
                                        />
                                    ) : (
                                        <p className="pb-4 text-[0.95rem] text-zinc-500">No details available.</p>
                                    )
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                <p className="border-t border-zinc-200 pt-2.5 text-[0.98rem] text-zinc-500">SKU: {product.sku || 'N/A'}</p>
            </div>

            {isSizeChartModalOpen ? (
                <div
                    className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/65 px-4 py-8 sm:items-center sm:pt-12 lg:pt-16"
                    onClick={() => setIsSizeChartModalOpen(false)}
                >
                    <div
                        className={`relative mt-6 w-[min(92vw,980px)] rounded-xl bg-white p-3 shadow-2xl sm:mt-0 sm:p-4 ${
                            hasMultipleSizeCharts ? 'max-w-[92vw] lg:max-w-5xl' : 'max-w-[min(92vw,700px)]'
                        }`}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setIsSizeChartModalOpen(false)}
                            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 text-lg text-zinc-700 transition hover:bg-zinc-100"
                            aria-label="Close size chart"
                        >
                            x
                        </button>

                        <h3 className="mb-3 pr-10 text-[1.05rem] font-semibold text-zinc-900">Size Chart</h3>

                        {resolvedSizeChartImages.length > 0 ? (
                            <div className="max-h-[78vh] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-2 sm:p-3">
                                <div className={`grid gap-3 ${hasMultipleSizeCharts ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                                    {resolvedSizeChartImages.map((image, index) => (
                                        <img
                                            key={`${image}-${index}`}
                                            src={image}
                                            alt={`Product size chart ${index + 1}`}
                                            className="mx-auto block h-auto max-h-[72vh] w-auto max-w-full rounded-md object-contain"
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500">No size chart available for this color variant.</p>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}