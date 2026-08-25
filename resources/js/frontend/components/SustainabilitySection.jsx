import { useEffect, useState } from 'react';

// Evaluate iframe builder status once outside component lifecycle
const checkIsBuilderPreview = () => {
    try {
        return window.self !== window.top;
    } catch {
        return false;
    }
};

const isBuilderPreview = checkIsBuilderPreview();

export default function SustainabilitySection() {
    const [givingBackData, setGivingBackData] = useState(null);
    const [previewOverride, setPreviewOverride] = useState(null);

    useEffect(() => {
        let ignore = false;
        async function loadGivingBack() {
            try {
                const response = await fetch('/api/public/about-giving-back', {
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) return;
                const payload = await response.json();
                if (!ignore && payload) {
                    setGivingBackData(payload);
                }
            } catch {}
        }
        loadGivingBack();
        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        if (!isBuilderPreview) return;

        function handleBuilderPreviewMessage(event) {
            if (event.origin !== window.location.origin) return;
            const data = event.data;
            if (data?.type === 'TIMLESS_PAGE_BUILDER_SUSTAINABILITY_PREVIEW_UPDATE') {
                setPreviewOverride((prev) => ({
                    ...(prev || {}),
                    ...(data.payload || {}),
                }));
            }
        }

        window.addEventListener('message', handleBuilderPreviewMessage);
        return () => window.removeEventListener('message', handleBuilderPreviewMessage);
    }, []);

    const displayData = {
        image: '/uploads/heroes/images/hero1.webp',
        section_title: 'Sustainability',
        title: 'Responsibility, Built In',
        description:
            "Viveren believes the future of fashion is honest, human, and considered.\n\nThe clothes you wear should feel good — on your body, in your values, and in the world you move through.",
        button_title: 'Explore Our Sustainability Approach',
        button_link: '#',
        button_enabled: true,
        ...(givingBackData || {}),
        ...(previewOverride || {}),
    };

    function handleSectionClick() {
        if (!isBuilderPreview) return;
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                { type: 'TIMLESS_PAGE_BUILDER_SUSTAINABILITY_SECTION_SELECTED' },
                window.location.origin
            );
        }
    }

    return (
        <section
            className="relative w-full overflow-hidden bg-black/5 py-8 sm:py-12"
            onClick={handleSectionClick}
            role={isBuilderPreview ? 'button' : undefined}
            tabIndex={isBuilderPreview ? 0 : undefined}
        >
            {/* Wrapper container to match your page layout width */}
            <div className="relative mx-auto w-full max-w-[1540px] px-5 sm:px-8 lg:px-12">
                <div className="relative overflow-hidden">
                    {/* Full Image Display */}
                    <img
                        src={displayData.image}
                        alt={displayData.title || "Sustainability background"}
                        className="w-full h-auto max-h-[85vh] object-contain object-center mx-auto block"
                        loading="lazy"
                        decoding="async"
                    />

                    {/* Dark overlay for text readability */}
                    <div className="absolute inset-0 bg-black/40 pointer-events-none" />

                    {/* Content Layer Over the Image */}
                    <div className="absolute inset-0 flex items-center p-8 sm:p-12 lg:p-16">
                        <div className="max-w-2xl">
                            <p className="text-[0.75rem] uppercase tracking-[0.2em] text-white/90">
                                {displayData.section_title}
                            </p>

                            <h2 className="mt-4 font-serif text-[clamp(2rem,5vw,3.8rem)] leading-[1.1] text-white">
                                {displayData.title}
                            </h2>

                            <div className="mt-6 space-y-6 text-[1.05rem] leading-[1.8] text-white/90 sm:text-[1.1rem]">
                                {String(displayData.description || '').split('\n\n').map((para, i) => (
                                    <p key={i}>{para}</p>
                                ))}
                            </div>

                            <a
                                href={displayData.button_link || '#'}
                                className="mt-8 inline-block border-b border-white pb-1 text-sm font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-70 pointer-events-auto"
                                style={{ display: displayData.button_enabled === false ? 'none' : 'inline-block' }}
                            >
                                {displayData.button_title || 'Explore Our Sustainability Approach'} →
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}