import { Suspense, lazy, useEffect, useRef, useState } from 'react';

import SectionSkeleton from '../components/SectionSkeleton.jsx';

const Hero = lazy(() => import('../components/Hero.jsx'));
const CollectionsSection = lazy(() => import('../components/CollectionsSection.jsx'));
const FeaturesSection = lazy(() => import('../components/FeaturesSection.jsx'));
const HomeBackgroundImageSection = lazy(
    () => import('../components/HomeBackgroundImageSection.jsx'),
);
const NewsletterSection = lazy(() => import('../components/NewsletterSection.jsx'));

function LazySection({ children, heightClass, variant = 'generic', defer = true }) {
    const containerRef = useRef(null);
    const [isVisible, setIsVisible] = useState(() => !defer);

    useEffect(() => {
        if (!defer) {
            setIsVisible(true);
            return;
        }

        if (isVisible) {
            return;
        }

        const node = containerRef.current;
        if (!node) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry?.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '240px 0px' },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [defer, isVisible]);

    return (
        <div ref={containerRef}>
            {isVisible ? (
                <Suspense fallback={<SectionSkeleton heightClass={heightClass} variant={variant} />}>
                    {children}
                </Suspense>
            ) : (
                <SectionSkeleton heightClass={heightClass} variant={variant} />
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


    trending: { height: 'h-[520px]', variant: 'catalog', component: lazy(() => import('../components/TrendingProduct.jsx')) },
   
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
            if (event.origin !== window.location.origin) {
                return;
            }

            const data = event.data;
            if (!data) {
                return;
            }

            if (data.type === 'TIMLESS_PAGE_BUILDER_SCROLL_TO_SECTION') {
                const sectionKey = data.payload?.sectionKey;
                if (!sectionKey) {
                    return;
                }

                const target = document.getElementById(`section-${sectionKey}`);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                return;
            }

            if (data.type !== 'TIMLESS_PAGE_BUILDER_HOME_LAYOUT_UPDATE') {
                return;
            }

            const incomingOrder = Array.isArray(data.payload?.order) ? data.payload.order : null;
            if (!incomingOrder || incomingOrder.length === 0) {
                return;
            }

            const safeOrder = normalizeSectionOrder(incomingOrder);
            if (safeOrder.length > 0) {
                setSectionOrder(safeOrder);
            }
        }

        window.addEventListener('message', handleBuilderLayoutMessage);
        return () => window.removeEventListener('message', handleBuilderLayoutMessage);
    }, []);

    return (
        <div className="bg-[#f5efe6]">
            {sectionOrder.map((sectionKey) => {
                const section = sectionRegistry[sectionKey];
                if (!section) {
                    return null;
                }

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


