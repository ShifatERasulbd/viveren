import { useEffect, useState } from 'react';

export default function SustainabilitySection() {
    const [givingBackData, setGivingBackData] = useState({
        image: '/uploads/heroes/images/hero1.webp',
        section_title: 'Sustainability',
        title: 'Responsibility, Built In',
        description:
            "Viveren believes the future of fashion is honest, human, and considered.\n\nThe clothes you wear should feel good — on your body, in your values, and in the world you move through.",
        button_title: 'Explore Our Sustainability Approach',
        button_link: '#',
        button_enabled: true,
    });

    const [previewOverride, setPreviewOverride] = useState(null);
    const [isBuilderPreview] = useState(() => {
        try { return window.self !== window.top; } catch { return false; }
    });

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
                    setGivingBackData((prev) => ({
                        ...prev,
                        image: payload.image || prev.image,
                        section_title: payload.section_title || prev.section_title,
                        title: payload.title || prev.title,
                        description: payload.description ?? prev.description,
                        button_title: payload.button_title ?? prev.button_title,
                        button_link: payload.button_link ?? prev.button_link,
                        button_enabled: payload.button_enabled ?? prev.button_enabled,
                    }));
                }
            } catch {}
        }
        loadGivingBack();
        return () => { ignore = true; };
    }, []);

    useEffect(() => {
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

    const displayData = previewOverride ? { ...givingBackData, ...previewOverride } : givingBackData;

    // RESTORED FUNCTION
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
            className="relative flex min-h-[500px] w-full items-center bg-cover bg-center py-20"
            style={{ backgroundImage: `url(${displayData.image})` }}
            onClick={handleSectionClick}
            role={isBuilderPreview ? 'button' : undefined}
            tabIndex={isBuilderPreview ? 0 : undefined}
        >
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0" />

            <div className="relative mx-auto w-full max-w-[1540px] px-5 sm:px-8 lg:px-12">
                <div className="max-w-2xl">
                    <p className="text-[0.75rem] uppercase tracking-[0.2em] text-white/90">
                        {displayData.section_title}
                    </p>

                    <h2 className="mt-4 font-serif text-[clamp(2.5rem,6vw,4rem)] leading-[1.1] text-white">
                        {displayData.title}
                    </h2>

                    <div className="mt-6 space-y-6 text-[1.1rem] leading-[1.8] text-white/90">
                        {String(displayData.description || '').split('\n\n').map((para, i) => (
                            <p key={i}>{para}</p>
                        ))}
                    </div>

                    <a
                        href={displayData.button_link || '#'}
                        className="mt-8 inline-block border-b border-white pb-1 text-sm font-medium uppercase tracking-widest text-white transition-opacity hover:opacity-70"
                        style={{ display: displayData.button_enabled === false ? 'none' : 'inline-block' }}
                    >
                        {displayData.button_title || 'Explore Our Sustainability Approach'} →
                    </a>
                </div>
            </div>
        </section>
    );
}