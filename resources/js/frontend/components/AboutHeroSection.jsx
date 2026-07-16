import { useEffect, useState } from 'react';
import AboutHeader from './AboutHeader';

const defaultAboutHeroData = {
    background_image: '/uploads/heroes/images/hero1.webp',
    section_title: 'Our Story',
    title: 'A life lived in the sun.',
    description:
        'At Vivaren, we believe the clothes you wear every day should never feel ordinary. Inspired by the Latin word vivere to live, we create elevated essentials that combine timeless design, premium craftsmanship, and lasting comfort.',
};

export default function AboutHeroSection() {
    const [heroData, setHeroData] = useState(defaultAboutHeroData);
    const [previewOverride, setPreviewOverride] = useState(null);
    const [isBuilderPreview] = useState(() => {
        try {
            return window.self !== window.top;
        } catch {
            return false;
        }
    });

    useEffect(() => {
        let ignore = false;
        async function loadAboutHero() {
            try {
                const response = await fetch('/api/public/about-hero', {
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) return;
                const payload = await response.json();
                if (!ignore && payload) {
                    setHeroData((previous) => ({
                        ...previous,
                        background_image: payload.background_image || previous.background_image,
                        section_title: payload.section_title || previous.section_title,
                        title: payload.title || previous.title,
                        description: payload.description ?? previous.description,
                    }));
                }
            } catch {}
        }
        loadAboutHero();
        return () => { ignore = true; };
    }, []);

    useEffect(() => {
        function handleBuilderPreviewMessage(event) {
            if (event.origin !== window.location.origin) return;
            const data = event.data;
            if (data?.type === 'TIMLESS_PAGE_BUILDER_ABOUT_HERO_PREVIEW_UPDATE') {
                setPreviewOverride((previous) => ({
                    ...(previous || {}),
                    ...(data.payload || {}),
                }));
            }
        }
        window.addEventListener('message', handleBuilderPreviewMessage);
        return () => window.removeEventListener('message', handleBuilderPreviewMessage);
    }, []);

    const displayHeroData = previewOverride ? { ...heroData, ...previewOverride } : heroData;
    const backgroundImage = displayHeroData.background_image || defaultAboutHeroData.background_image;
    const sectionTitle = String(displayHeroData.section_title || defaultAboutHeroData.section_title || '').trim();
    const heroTitle = String(displayHeroData.title || defaultAboutHeroData.title || '').trim();
    const description = String(displayHeroData.description || defaultAboutHeroData.description || '').trim();

    function handleHeroClick() {
        if (!isBuilderPreview) return;
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'TIMLESS_PAGE_BUILDER_ABOUT_HERO_SECTION_SELECTED' }, window.location.origin);
        }
    }

    function handleSectionKeyDown(event) {
        if (!isBuilderPreview) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        handleHeroClick();
    }

    return (
        <section
            className="w-full bg-background px-4 pt-8 pb-0 sm:px-6 sm:pt-10 sm:pb-0 lg:px-8 lg:pt-12 lg:pb-0"
            onClick={handleHeroClick}
            onKeyDown={handleSectionKeyDown}
            role={isBuilderPreview ? 'button' : undefined}
            tabIndex={isBuilderPreview ? 0 : undefined}
        >
            {/* Removed the max-w-[1280px] from the wrapper to allow wider layout */}
            <div className="mx-auto w-full"> 
                <AboutHeader 
                    sectionTitle={sectionTitle} 
                    heroTitle={heroTitle} 
                    description={description} 
                />

                {/* 
                   Increased the max-width of this container or removed it to make the image wider.
                   Added max-w-[1540px] to allow it to expand beyond 1280px.
                */}
                <div className="mx-auto mt-6 max-w-[1640px] overflow-hidden border border-[#ddd4c8] bg-[#e9dfd2]/20 sm:mt-8">
                    <img
                        src={backgroundImage}
                        alt="About hero background"
                        className="h-[280px] w-full object-cover object-center sm:h-[420px] lg:h-[560px]"
                    />
                </div>
            </div>
        </section>
    );
}