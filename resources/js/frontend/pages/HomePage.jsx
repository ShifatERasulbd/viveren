import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import SectionSkeleton from '../components/SectionSkeleton.jsx';

const Hero = lazy(() => import('../components/Hero.jsx'));
const CollectionsSection = lazy(() => import('../components/CollectionsSection.jsx'));
const FeaturesSection = lazy(() => import('../components/FeaturesSection.jsx'));
const HomeBackgroundImageSection = lazy(() => import('../components/HomeBackgroundImageSection.jsx'));
const TrendingProduct = lazy(() => import('../components/TrendingProduct.jsx'));
const NewsletterSection = lazy(() => import('../components/NewsletterSection.jsx'));

/**
 * Progressive 3-phase lazy loading section:
 *   'hidden'   → lightweight empty placeholder (just bg + height, no skeleton)
 *   'skeleton' → renders SectionSkeleton when near viewport (~800px out)
 *   'visible'  → renders actual component via <Suspense> when close (~240px out)
 */
function LazySection({ children, heightClass, variant = 'generic', defer = true }) {
    const containerRef = useRef(null);
    const [phase, setPhase] = useState(() => (defer ? 'hidden' : 'visible'));

    useEffect(() => {
        if (!defer) return;
        const node = containerRef.current;
        if (!node) return;

        // Phase 1: hidden → skeleton (far away, ~800px rootMargin)
        const skeletonObserver = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setPhase((prev) => (prev === 'hidden' ? 'skeleton' : prev));
                    skeletonObserver.disconnect();
                }
            },
            { rootMargin: '800px 0px' }
        );

        // Phase 2: skeleton → visible (close, ~240px rootMargin)
        const visibleObserver = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setPhase('visible');
                    visibleObserver.disconnect();
                }
            },
            { rootMargin: '240px 0px' }
        );

        skeletonObserver.observe(node);
        visibleObserver.observe(node);

        return () => {
            skeletonObserver.disconnect();
            visibleObserver.disconnect();
        };
    }, [defer]);

    return (
        <div ref={containerRef}>
            {phase === 'visible' ? (
                <Suspense fallback={<SectionSkeleton heightClass={heightClass} variant={variant} />}>
                    {children}
                </Suspense>
            ) : phase === 'skeleton' ? (
                <SectionSkeleton heightClass={heightClass} variant={variant} />
            ) : (
                /* 'hidden' — lightweight placeholder, no skeleton markup */
                <div
                    className={`w-full bg-[#f5f5f3] ${heightClass}`}
                    aria-hidden="true"
                />
            )}
        </div>
    );
}

const sectionRegistry = {
    hero: { height: 'h-[520px]', variant: 'hero', component: Hero },
    collections: { height: 'h-[560px]', variant: 'catalog', component: CollectionsSection },
    'home-background-image': {
        height: 'h-[520px] sm:h-[620px] lg:h-screen',
        variant: 'hero',
        component: HomeBackgroundImageSection,
    },
    trending: { height: 'h-[520px]', variant: 'catalog', component: TrendingProduct },
    newsletter: { height: 'h-[220px]', variant: 'newsletter', component: NewsletterSection },
};

const defaultSectionOrder = [
    'hero',
    'collections',
    'home-background-image',
    'trending',
    'newsletter',
];

function normalizeSectionOrder(order) {
    const incoming = Array.isArray(order) ? order : [];
    const safeOrder = incoming.filter((key) => Object.prototype.hasOwnProperty.call(sectionRegistry, key));
    const uniqueOrder = [...new Set(safeOrder)];

    if (!uniqueOrder.includes('hero')) {
        uniqueOrder.unshift('hero');
    }

    return uniqueOrder;
}

export default function HomePage() {
    const [isBuilderPreview] = useState(() => {
        try {
            return window.self !== window.top;
        } catch {
            return false;
        }
    });

    const [sectionOrder, setSectionOrder] = useState(() => normalizeSectionOrder(defaultSectionOrder));

    useEffect(() => {
        function handleBuilderLayoutMessage(event) {
            if (event.origin !== window.location.origin) return;

            const data = event.data;
            if (!data) return;

            if (data.type === 'TIMLESS_PAGE_BUILDER_SCROLL_TO_SECTION') {
                const sectionKey = data.payload?.sectionKey;
                if (!sectionKey) return;

                const target = document.getElementById(`section-${sectionKey}`);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                return;
            }

            if (data.type === 'TIMLESS_PAGE_BUILDER_HOME_LAYOUT_UPDATE') {
                const incomingOrder = Array.isArray(data.payload?.order) ? data.payload.order : null;
                if (!incomingOrder || incomingOrder.length === 0) return;

                const safeOrder = normalizeSectionOrder(incomingOrder);
                if (safeOrder.length > 0) {
                    setSectionOrder(safeOrder);
                }
            }
        }

        window.addEventListener('message', handleBuilderLayoutMessage);
        return () => window.removeEventListener('message', handleBuilderLayoutMessage);
    }, []);

    return (
        <div className="bg-[#f5efe6]">
            {sectionOrder.map((sectionKey) => {
                const section = sectionRegistry[sectionKey];
                if (!section) return null;

                const Component = section.component;
                return (
                    <div
                        key={sectionKey}
                        id={`section-${sectionKey}`}
                        data-section-key={sectionKey}
                        className="scroll-mt-24"
                    >
                        <LazySection
                            heightClass={section.height}
                            variant={section.variant}
                            defer={!isBuilderPreview && sectionKey !== 'hero'}
                        >
                            <Component />
                        </LazySection>
                    </div>
                );
            })}
        </div>
    );
}