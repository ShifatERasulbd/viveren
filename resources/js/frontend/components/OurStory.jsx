import { useEffect, useState } from 'react';

export default function OurStory() {
    const [missionData, setMissionData] = useState({
        background_image: '/uploads/heroes/images/hero1.webp',
        image_title: 'Our Story',
        title: 'Our Story',
        description: 'Our mission is to make personalized fashion accessible, premium, and expressive. We aim to deliver apparel that combines comfort, durability, and modern design while giving customers the freedom to create styles that represent their identity.',
    });

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

        async function loadAboutMission() {
            try {
                const response = await fetch('/api/public/about-mission', {
                    headers: { Accept: 'application/json' },
                });

                if (!response.ok) return;

                const payload = await response.json();
                if (!ignore && payload) {
                    setMissionData((previous) => ({
                        ...previous,
                        background_image: payload.background_image || previous.background_image,
                        image_title: payload.image_title || previous.image_title,
                        title: payload.title || previous.title,
                        description: payload.description ?? previous.description,
                    }));
                }
            } catch {
                // Keep current state on failure
            }
        }

        loadAboutMission();

        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        function handleBuilderPreviewMessage(event) {
            if (event.origin !== window.location.origin) return;
            const data = event.data;
            if (data?.type === 'TIMLESS_PAGE_BUILDER_OUR_STORY_PREVIEW_UPDATE') {
                setPreviewOverride((previous) => ({
                    ...(previous || {}),
                    ...(data.payload || {}),
                }));
            }
        }

        window.addEventListener('message', handleBuilderPreviewMessage);
        return () => {
            window.removeEventListener('message', handleBuilderPreviewMessage);
        };
    }, []);

    const displayData = previewOverride ? { ...missionData, ...previewOverride } : missionData;

    function handleSectionClick() {
        if (!isBuilderPreview) return;
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                { type: 'TIMLESS_PAGE_BUILDER_OUR_STORY_SECTION_SELECTED' },
                window.location.origin
            );
        }
    }

    return (
        <section
           className="pt-0 pb-14 sm:pb-16 lg:pb-20"
            onClick={handleSectionClick}
            role={isBuilderPreview ? 'button' : undefined}
            tabIndex={isBuilderPreview ? 0 : undefined}
        >
            <div className="mx-auto w-full max-w-[1500px] px-5 sm:px-8 lg:px-12">
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
                    <div>
                        <h2 className="font-serif text-[clamp(2rem,4.3vw,3.2rem)] uppercase tracking-[0.06em] text-zinc-900">
                            {displayData.title}
                        </h2>

                        <p className="font-monstrate mt-4 max-w-[65ch] text-[1.08rem] leading-[1.85] text-zinc-700 sm:text-[1.15rem]">
                            {displayData.description}
                        </p>
                    </div>

                    <div>
                        <div
                            className="relative flex h-[320px] w-full items-center justify-center overflow-hidden rounded-none border border-zinc-200 shadow-[0_24px_60px_rgba(0,0,0,0.20)] sm:h-[420px] lg:h-[460px]"
                            style={{
                                backgroundImage: `url(${displayData.background_image})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                        >
                            {/* Permanent Overlay for readability */}
                            <div className="absolute inset-0 bg-black/40" />

                            {/* Persistent Title */}
                            <h3 className="pointer-events-none relative px-6 text-center font-serif text-3xl uppercase tracking-widest text-white">
                                {displayData.image_title}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}