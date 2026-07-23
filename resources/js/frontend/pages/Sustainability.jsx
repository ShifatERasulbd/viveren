import { Suspense, lazy, useEffect, useState } from 'react';

import SectionSkeleton from '../components/SectionSkeleton.jsx';

const SustainabilityHeroSection = lazy(() => import('../components/SustainabilityHeroSection.jsx'));
const LongevitySection = lazy(() => import('../components/DesignedForLongivity.jsx'));
const MindfulMaterials = lazy(() => import('../components/ThoughtfullyChoosenMeterials.jsx'));
const BehindTheCraft = lazy(() => import('../components/BehindTheCraft.jsx'));
const FabricInnovations = lazy(() => import('../components/OurMaterials.jsx'));
function LazySection({ children, heightClass, variant = 'generic', defer = true }) {
    const [isVisible, setIsVisible] = useState(() => !defer);

    useEffect(() => {
        if (!defer) {
            setIsVisible(true);
            return;
        }

        if (isVisible) return;

        const node = document.getElementById(heightClass) || null;
        if (!node) {
            setIsVisible(true);
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
    }, [defer, isVisible, heightClass]);

    return (
        <div>
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

export default function SustainabilityPage() {
    const [isBuilderPreview] = useState(() => {
        try {
            return window.self !== window.top;
        } catch {
            return false;
        }
    });

    useEffect(() => {
    }, []);

    return (
        <div className="bg-background">
            <div id="section-hero">
                <LazySection heightClass="h-[520px]" variant="hero" defer={false}>
                    <SustainabilityHeroSection />
                </LazySection>
            </div>
            <div id="section-longevity">
                <LazySection heightClass="h-[600px]" variant="generic" defer={false}>
                    <LongevitySection />
                </LazySection>
            </div>
            <div id="section-mindful-materials">
                <LazySection heightClass="h-[600px]" variant="generic" defer={false}>
                    <MindfulMaterials />
                </LazySection>
            </div>
            
            <div id="section-behind-the-craft">
                <LazySection heightClass="h-[600px]" variant="generic" defer={false}>
                    <BehindTheCraft />
                </LazySection>
            </div>
            <div id="section-fabric-innovations">
                <LazySection heightClass="h-[600px]" variant="generic" defer={false}>
                    <FabricInnovations />
                </LazySection>
            </div>
        </div>
    );
}

