import { Suspense, lazy, useEffect, useRef, useState } from 'react';

import SectionSkeleton from '../components/SectionSkeleton.jsx';

const AboutHeroSection = lazy(() => import('../components/AboutHeroSection.jsx'));

const About1971Section = lazy(() => import('../components/AboutSection.jsx'));
const OurStory = lazy(() => import('../components/OurStory.jsx'));
const SustainabilitySection = lazy(() => import('../components/SustainabilitySection.jsx'));
const NewsletterSection = lazy(() => import('../components/NewsletterSection.jsx'));
const FabricTechnologySection = lazy(() => import('../components/FabricandTechnology.jsx'));
const InstagramSection = lazy(() => import('../components/InstagramSection.jsx'));

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
            { rootMargin: '220px 0px' },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [defer, isVisible]);

    return (
        <div ref={containerRef}>
            {isVisible ? (
                <Suspense fallback={<SectionSkeleton heightClass={heightClass} variant={variant} />}>{children}</Suspense>
            ) : (
                <SectionSkeleton heightClass={heightClass} variant={variant} />
            )}
        </div>
    );
}
export default function AboutPage() {
    const [isBuilderPreview] = useState(() => {
        try {
            return window.self !== window.top;
        } catch {
            return false;
        }
    });
    useEffect(() => {
        document.title = 'About | 1971Co';

        function handleBuilderMessage(event) {
            if (event.origin !== window.location.origin) {
                return;
            }

            const data = event.data;
            if (!data || data.type !== 'TIMLESS_PAGE_BUILDER_SCROLL_TO_SECTION') {
                return;
            }

            const sectionKey = data.payload?.sectionKey;
            if (!sectionKey) {
                return;
            }

            const target = document.getElementById(`section-${sectionKey}`);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        window.addEventListener('message', handleBuilderMessage);
        return () => window.removeEventListener('message', handleBuilderMessage);
    }, []);

    return (
            <div className="bg-background">
            <div id="section-hero">
                <LazySection heightClass="h-[520px]" variant="hero" defer={false}>
                    <AboutHeroSection />
                </LazySection>
            </div>

            <div id="section-1971-about">
                <LazySection heightClass="h-[520px]" variant="split" defer={!isBuilderPreview}>
                    <About1971Section />
                </LazySection>
            </div>

            <div id="section-our-story">
                <LazySection heightClass="h-[540px]" variant="split" defer={!isBuilderPreview}>
                    <OurStory />
                </LazySection>
            </div>

            <div id="section-sustainability">
                <LazySection heightClass="h-[560px]" variant="split" defer={!isBuilderPreview}>
                    <SustainabilitySection />
                </LazySection>
            </div>

            <div id="section-fabric-technology">
                <LazySection heightClass="h-[560px]" variant="split" defer={!isBuilderPreview}>
                    <FabricTechnologySection />
                </LazySection>
            </div>
           
        </div>
    );
}