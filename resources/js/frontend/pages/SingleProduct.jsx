import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

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

function productMatchesColor(product, colorParam, colorNameById = {}) {
    const wanted = String(colorParam || '').trim().toLowerCase();
    if (!wanted) {
        return false;
    }

    return parseColorTokens(product?.color).some((token) => {
        const rawToken = String(token || '').trim().toLowerCase();
        // Direct match
        if (rawToken === wanted) {
            return true;
        }
        // If product color is an ID, resolve to name and compare
        const resolvedName = colorNameById[rawToken];
        if (resolvedName && resolvedName.toLowerCase() === wanted) {
            return true;
        }
        return false;
    });
}

export default function SingleProductPage() {
    const { slug: routeSlug = '', color: routeColor = '' } = useParams();
    const [searchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
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
            } catch {}
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

    const currentProduct = useMemo(() => {
        if (!Array.isArray(products) || products.length === 0) {
            return null;
        }

        const slugParam = routeSlug || searchParams.get('slug');
        const nameParam = searchParams.get('name');
        const colorParam = (routeColor || searchParams.get('color') || '').replace(/-/g, ' ');

        if (slugParam) {
            const bySlugCandidates = products.filter((item) => String(item?.slug || '') === String(slugParam));
            const bySlug = bySlugCandidates.find((item) => productMatchesColor(item, colorParam, colorNameById)) || bySlugCandidates[0];
            if (bySlug) {
                return bySlug;
            }
        }

        if (nameParam) {
            const normalizedName = String(nameParam).trim().toLowerCase();
            const byNameCandidates = products.filter(
                (item) => String(item?.name || '').trim().toLowerCase() === normalizedName,
            );
            const byName = byNameCandidates.find((item) => productMatchesColor(item, colorParam, colorNameById)) || byNameCandidates[0];

            if (byName) {
                return byName;
            }
        }

        return products[0] || null;
    }, [products, routeSlug, routeColor, searchParams, colorNameById]);

    const initialColor = useMemo(() => {
        const colorParam = String(routeColor || searchParams.get('color') || '').trim().replace(/-/g, ' ');
        return colorParam;
    }, [routeColor, searchParams]);

    const relatedProducts = useMemo(() => {
        if (!currentProduct) {
            return [];
        }

        const sameGroup = products.filter(
            (item) =>
                item?.id !== currentProduct.id
                && item?.grand_child_id != null
                && item?.grand_child_id === currentProduct.grand_child_id,
        );

        const fallback = products.filter((item) => item?.id !== currentProduct.id);

        return (sameGroup.length > 0 ? sameGroup : fallback).slice(0, 8);
    }, [products, currentProduct]);

    if (isLoading) {
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
                <SingleProductMainSection product={currentProduct} initialColor={initialColor} />
            </LazySection>
            <LazySection heightClass="h-[320px]" variant="generic">
                {/* <SingleProductInfoTabs product={currentProduct} /> */}
            </LazySection>
            <LazySection heightClass="h-[640px]" variant="catalog">
                <RelatedProductsSection products={relatedProducts} />
            </LazySection>
            <LazySection heightClass="h-[220px]" variant="newsletter">
                <NewsletterSection />
            </LazySection>
           
        </div>
    );
}
