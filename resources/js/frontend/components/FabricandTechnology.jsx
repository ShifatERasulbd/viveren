import { useEffect, useState } from 'react';

export default function FabricTechnologySection() {
    const [fabricData, setFabricData] = useState({
        image: '/uploads/heroes/images/hero1.webp',
        section_title: 'Fabric & Technology',
        title: 'Fabric, Engineered with Purpose',
        description: 'Every Viveren fabric is engineered with purpose. From structured knits to breathable, compostable blends, our materials are selected to deliver comfort, durability, and effortless wear — without compromise.',
        button_title: 'Discover Our Fabrics',
        button_link: '#',
        button_enabled: true,
    });

    const [previewOverride, setPreviewOverride] = useState(null);
    const [isBuilderPreview] = useState(() => {
        try { return window.self !== window.top; } catch { return false; }
    });

    useEffect(() => {
        let ignore = false;
        async function load() {
            try {
                const response = await fetch('/api/public/about-fabric-technology', {
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) return;
                const payload = await response.json();
                if (!ignore && payload) {
                    setFabricData((prev) => ({
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
        load();
        return () => { ignore = true; };
    }, []);

    useEffect(() => {
        function handleMessage(event) {
            if (event.origin !== window.location.origin) return;
            const data = event.data;
            if (data?.type === 'TIMLESS_PAGE_BUILDER_FABRIC_TECHNOLOGY_PREVIEW_UPDATE') {
                setPreviewOverride((prev) => ({ ...(prev || {}), ...(data.payload || {}) }));
            }
        }
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const displayData = previewOverride ? { ...fabricData, ...previewOverride } : fabricData;

    function handleSectionClick() {
        if (!isBuilderPreview) return;
        window.parent?.postMessage(
            { type: 'TIMLESS_PAGE_BUILDER_FABRIC_TECHNOLOGY_SECTION_SELECTED' },
            window.location.origin
        );
    }

    return (
        <section
            className="bg-[#f5f0e9] py-16 sm:py-24"
            onClick={handleSectionClick}
            role={isBuilderPreview ? 'button' : undefined}
            tabIndex={isBuilderPreview ? 0 : undefined}
        >
            <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">

                    {/* Image Side */}
                    <div className="w-full">
                        <img
                            src={displayData.image}
                            alt="Fabric texture"
                            className="h-[400px] w-full object-cover shadow-sm sm:h-[500px]"
                        />
                    </div>

                    {/* Text Side */}
                    <div className="max-w-xl">
                        <p className="text-[0.7rem] font-medium uppercase tracking-[0.25em] text-[#8b7d6b]">
                            {displayData.section_title}
                        </p>

                        <h2 className="mt-4 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.1] text-zinc-900">
                            {displayData.title}
                        </h2>

                        <p className="mt-6 font-sans text-[1rem] leading-[1.8] text-zinc-700 sm:text-[1.1rem]">
                            {displayData.description}
                        </p>

                        {displayData.button_enabled !== false && (
                            <div className="mt-8">
                                <a
                                    href={displayData.button_link || '#'}
                                    className="inline-flex items-center border-b border-zinc-800 pb-1 text-[0.8rem] font-medium uppercase tracking-widest text-zinc-900 transition-opacity hover:opacity-60"
                                >
                                    {displayData.button_title || 'Discover Our Fabrics'} →
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}