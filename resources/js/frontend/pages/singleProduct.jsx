import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import SectionSkeleton from '../components/SectionSkeleton.jsx';
 
const SingleProductMainSection = lazy(() => import('../components/SingleProductMainSection.jsx'));
// const SingleProductInfoTabs = lazy(() => import('../components/SingleProductInfoTabs.jsx'));
const RelatedProductsSection = lazy(() => import('../components/RelatedProductsSection.jsx'));
const NewsletterSection = lazy(() => import('../components/NewsletterSection.jsx'));
const InstagramSection = lazy(() => import('../components/InstagramSection.jsx'));

function LazySection({ children, heightClass, variant = 'generic' }) {
    return <Suspense fallback={<SectionSkeleton heightClass={heightClass} variant={variant} />}>{children}</Suspense>;
}

function parseColorTokens(value) {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item || '').trim().replace(/^[\[\]"']+|[\[\]"']+$/g, ''))
            .filter(Boolean);
    }

    if (typeof value === 'string') {
        const raw = value.trim();
        if (!raw) {
            return [];
        }

        if (raw.startsWith('[') && raw.endsWith(']')) {
            try {
                const parsed = JSON.parse(raw);
                return parseColorTokens(parsed);
            } catch {
                // Fall back to comma-separated parsing.
            }
        }

        return raw
            .split(',')
            .map((item) => String(item || '').trim().replace(/^[\[\]"']+|[\[\]"']+$/g, ''))
            .filter(Boolean);
    }

    return [];
}

function toSlugToken(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// "women-s-short-2" belongs to "women-s-short" when a product with that base slug exists.
function createBaseSlugResolver(products) {
    const slugs = new Set(products.map((item) => String(item?.slug || '').trim()).filter(Boolean));

    return function resolveBaseSlug(slug) {
        let current = String(slug || '').trim();

        while (true) {
            const match = current.match(/^(.*)-\d+$/);
            if (match && slugs.has(match[1])) {
                current = match[1];
                continue;
            }
            return current;
        }
    };
}

function getProductColorLabels(product, colorNameById = {}) {
    return parseColorTokens(product?.color)
        .map((token) => String(colorNameById[token] || token).trim())
        .filter(Boolean);
}

function buildDetailUrl(slug, colorLabel = '') {
    const colorSlug = toSlugToken(colorLabel);
    return `/product-details/${encodeURIComponent(slug)}${colorSlug ? `/${encodeURIComponent(colorSlug)}` : ''}`;
}

function parseIdList(value) {
    let list = value;

    if (typeof list === 'string') {
        try {
            list = JSON.parse(list);
        } catch {
            list = list.split(',');
        }
    }

    if (!Array.isArray(list)) {
        return [];
    }

    return [...new Set(list.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
}

export default function SingleProductPage() {
    const { slug: routeSlug = '', color: routeColor = '' } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isColorsReady, setIsColorsReady] = useState(false);
    const [colorNameById, setColorNameById] = useState({});

    useEffect(() => {
        let ignore = false;

        async function bootstrap() {
            try {
                // Fetch colors to build ID-to-name lookup
                try {
                    const colorsRes = await fetch('/api/public/colors', { headers: { Accept: 'application/json' } });
                    if (colorsRes.ok) {
                        const colorsPayload = await colorsRes.json();
                        const colorList = Array.isArray(colorsPayload)
                            ? colorsPayload
                            : (Array.isArray(colorsPayload?.data) ? colorsPayload.data : []);
                        const idNameMap = {};
                        colorList.forEach((c) => {
                            const id = String(c?.id ?? '').trim();
                            const name = String(c?.name ?? '').trim();
                            if (id && name) {
                                idNameMap[id] = name;
                            }
                        });
                        if (!ignore) {
                            setColorNameById(idNameMap);
                        }
                    }
                } catch {}
            } catch {
                // Ignore; page falls back to raw color tokens.
            } finally {
                if (!ignore) {
                    setIsColorsReady(true);
                }
            }
        }

        bootstrap();

        return () => { ignore = true; };
    }, []);

    useEffect(() => {
        let ignore = false;

        async function loadProducts() {
            try {
                const response = await fetch('/api/public/shop-products', {
                    headers: { Accept: 'application/json' },
                });

                if (!response.ok) {
                    if (!ignore) {
                        setProducts([]);
                    }
                    return;
                }

                const payload = await response.json();
                if (!ignore) {
                    setProducts(Array.isArray(payload) ? payload : []);
                }
            } catch {
                if (!ignore) {
                    setProducts([]);
                }
            } finally {
                if (!ignore) {
                    setIsLoading(false);
                }
            }
        }

        loadProducts();

        return () => {
            ignore = true;
        };
    }, []);

    // All products that share one base slug (women-s-short, women-s-short-2, ...) form one page.
    const productGroup = useMemo(() => {
        if (!Array.isArray(products) || products.length === 0) {
            return null;
        }

        const resolveBase = createBaseSlugResolver(products);
        const hasSlug = (item) => String(item?.slug || '').trim() !== '';
        const collectMembers = (base) => products.filter((item) => hasSlug(item) && resolveBase(item.slug) === base);

        const slugParam = String(routeSlug || searchParams.get('slug') || '').trim();
        const nameParam = String(searchParams.get('name') || '').trim().toLowerCase();

        let canonicalSlug = '';
        let members = [];
        let entry = null;
        let matchedBySlug = false;

        const adopt = (item) => {
            entry = item;
            if (hasSlug(item)) {
                canonicalSlug = resolveBase(item.slug);
                members = collectMembers(canonicalSlug);
            } else {
                canonicalSlug = '';
                members = [item];
            }
        };

        if (slugParam) {
            const base = resolveBase(slugParam);
            const found = collectMembers(base);
            if (found.length > 0) {
                canonicalSlug = base;
                members = found;
                matchedBySlug = true;
                entry = found.find((item) => String(item.slug).trim() === slugParam) || null;
            }
        }

        if (members.length === 0 && nameParam) {
            const byName = products.find((item) => String(item?.name || '').trim().toLowerCase() === nameParam);
            if (byName) {
                adopt(byName);
            }
        }

        if (members.length === 0) {
            adopt(products[0]);
        }

        const suffixRank = (item) => {
            const slug = String(item?.slug || '').trim();
            if (slug === canonicalSlug) {
                return 0;
            }
            const match = slug.slice(canonicalSlug.length).match(/^-(\d+)$/);
            return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
        };

        const sortedMembers = [...members].sort(
            (left, right) => suffixRank(left) - suffixRank(right) || Number(left?.id) - Number(right?.id),
        );

        return {
            canonicalSlug,
            members: sortedMembers,
            entry: entry && sortedMembers.includes(entry) ? entry : sortedMembers[0],
            matchedBySlug,
        };
    }, [products, routeSlug, searchParams]);

    // Unique colors across every product in the group; each color points at the product that owns it.
    const groupColors = useMemo(() => {
        if (!productGroup) {
            return [];
        }

        const seen = new Map();

        productGroup.members.forEach((member) => {
            getProductColorLabels(member, colorNameById).forEach((label) => {
                const key = toSlugToken(label);
                if (key && !seen.has(key)) {
                    seen.set(key, { label, slug: key, product: member });
                }
            });
        });

        return [...seen.values()];
    }, [productGroup, colorNameById]);

    const colorOptions = useMemo(() => groupColors.map((item) => item.label), [groupColors]);

    const requestedColor = useMemo(() => {
        const requestedSlug = toSlugToken(routeColor || searchParams.get('color') || '');
        if (!requestedSlug) {
            return null;
        }
        return groupColors.find((item) => item.slug === requestedSlug) || null;
    }, [groupColors, routeColor, searchParams]);

    // Description, images, sizes, price... all come from the product that owns the selected color.
    const currentProduct = requestedColor?.product || productGroup?.entry || null;

    const initialColor = useMemo(() => {
        if (requestedColor) {
            return requestedColor.label;
        }

        if (!currentProduct || !productGroup || currentProduct === productGroup.members[0]) {
            return '';
        }

        return getProductColorLabels(currentProduct, colorNameById)[0] || '';
    }, [requestedColor, currentProduct, productGroup, colorNameById]);

    // /product-details/women-s-short-2[/color] -> /product-details/women-s-short/color
    useEffect(() => {
        if (!productGroup?.matchedBySlug || !currentProduct || !productGroup.canonicalSlug) {
            return;
        }

        if (String(routeSlug || '').trim() === productGroup.canonicalSlug) {
            return;
        }

        navigate(buildDetailUrl(productGroup.canonicalSlug, initialColor), { replace: true });
    }, [productGroup, currentProduct, routeSlug, initialColor, navigate]);

    const handleColorChange = useCallback((colorLabel) => {
        if (!productGroup?.canonicalSlug) {
            return;
        }

        navigate(buildDetailUrl(productGroup.canonicalSlug, colorLabel), { replace: true });
    }, [productGroup, navigate]);

    const relatedProducts = useMemo(() => {
        if (!currentProduct) {
            return [];
        }

        const groupIds = new Set((productGroup?.members || [currentProduct]).map((item) => Number(item?.id)));

        // If related products were selected in admin (related_product_ids), show only those.
        const selectedIds = parseIdList(currentProduct.related_product_ids)
            .filter((id) => !groupIds.has(id));

        if (selectedIds.length > 0) {
            return selectedIds
                .map((id) => products.find((item) => Number(item?.id) === id))
                .filter(Boolean);
        }

        // Nothing selected (null / empty): keep the original behavior.
        const sameGroup = products.filter(
            (item) =>
                !groupIds.has(Number(item?.id))
                && item?.grand_child_id != null
                && item?.grand_child_id === currentProduct.grand_child_id,
        );

        const fallback = products.filter((item) => !groupIds.has(Number(item?.id)));

        return (sameGroup.length > 0 ? sameGroup : fallback).slice(0, 8);
    }, [products, currentProduct, productGroup]);

    const comboProducts = useMemo(() => {
        const currentId = Number(currentProduct?.id);
        if (!Number.isInteger(currentId) || currentId <= 0) {
            return [];
        }

        const forwardIds = Array.isArray(currentProduct?.combo_product_ids)
            ? currentProduct.combo_product_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
            : [];

        const matched = new Map();

        forwardIds.forEach((id) => {
            const match = products.find((item) => Number(item?.id) === id);
            if (match) {
                matched.set(id, match);
            }
        });

        // Reciprocal: also show this product on the page of any product that listed it as a combo.
        products.forEach((item) => {
            const itemId = Number(item?.id);
            if (itemId === currentId) {
                return;
            }

            const itemComboIds = Array.isArray(item?.combo_product_ids)
                ? item.combo_product_ids.map((id) => Number(id))
                : [];

            if (itemComboIds.includes(currentId) && !matched.has(itemId)) {
                matched.set(itemId, item);
            }
        });

        return [...matched.values()];
    }, [products, currentProduct]);

    if (isLoading || !isColorsReady) {
        return (
            <div className="bg-background">
                <LazySection heightClass="h-[760px]" variant="product">
                    <SectionSkeleton heightClass="h-[760px]" variant="product" />
                </LazySection>
            </div>
        );
    }

    if (!currentProduct) {
        return (
            <div className="bg-background px-6 py-20 text-center text-zinc-600">
                Product not found.
            </div>
        );
    }

    return (
        <div className="bg-background">
            <LazySection heightClass="h-[760px]" variant="product">
                <SingleProductMainSection
                    product={currentProduct}
                    initialColor={initialColor}
                    comboProducts={comboProducts}
                    colorOptions={colorOptions}
                    canonicalSlug={productGroup?.canonicalSlug || ''}
                    onColorChange={handleColorChange}
                />
            </LazySection>
          
            <LazySection heightClass="h-[640px]" variant="catalog">
                <RelatedProductsSection products={relatedProducts} currentProduct={currentProduct} />
            </LazySection>
            <LazySection heightClass="h-[220px]" variant="newsletter">
                <NewsletterSection />
            </LazySection>
           
        </div>
    );
}