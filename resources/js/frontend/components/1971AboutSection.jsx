import { useEffect, useState } from 'react';

export default function About1971Section() {
    const [storyData, setStoryData] = useState({
        background_image: '/uploads/heroes/images/hero1.webp',
        section_title: 'The Beginning',
        title: 'Why 1971?',
        description_html:
            '<p>"1971" carries deep historical significance representing independence, pride, and cultural identity. It signals that our brand is rooted in Bangladeshi legacy, not copying Western streetwear but redefining its own path.</p><p>The "Co" brings a fresh, youthful street vibe clean, approachable, and contemporary. Together, they represent our mission: heritage meets modern street culture.</p><p>At 1971Co, we believe streetwear is more than clothing. It\'s a statement of identity and confidence. Our designs combine bold aesthetics, urban culture influences, and high-quality craftsmanship to help individuals express themselves fearlessly.</p>',
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
        async function loadAboutStory() {
            try {
                const response = await fetch('/api/public/about-story', {
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) return;
                const payload = await response.json();
                if (!ignore && payload) {
                    setStoryData((previous) => ({
                        ...previous,
                        background_image: payload.background_image || previous.background_image,
                        section_title: payload.section_title || previous.section_title,
                        title: payload.title || previous.title,
                        description_html: payload.description_html ?? previous.description_html,
                    }));
                }
            } catch {}
        }
        loadAboutStory();
        return () => { ignore = true; };
    }, []);

    useEffect(() => {
        function handleBuilderPreviewMessage(event) {
            if (event.origin !== window.location.origin) return;
            const data = event.data;
            if (data?.type === 'TIMLESS_PAGE_BUILDER_1971_STORY_PREVIEW_UPDATE') {
                setPreviewOverride((previous) => ({
                    ...(previous || {}),
                    ...(data.payload || {}),
                }));
            }
        }
        window.addEventListener('message', handleBuilderPreviewMessage);
        return () => window.removeEventListener('message', handleBuilderPreviewMessage);
    }, []);

    const displayStoryData = previewOverride ? { ...storyData, ...previewOverride } : storyData;

    function handleSectionClick() {
        if (!isBuilderPreview) return;
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                { type: 'TIMLESS_PAGE_BUILDER_1971_STORY_SECTION_SELECTED' },
                window.location.origin
            );
        }
    }

    return (
        <section
            id="about-1971-story"
            className="pt-3 pb-5 sm:pt-3 lg:pt-3"
            onClick={handleSectionClick}
            role={isBuilderPreview ? 'button' : undefined}
            tabIndex={isBuilderPreview ? 0 : undefined}
        >
            <div className="mx-auto w-full max-w-[1540px] px-5 sm:px-8 lg:px-12">
                <article className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16 xl:gap-20">
                    
                    {/* Image Container with Background and Overlay */}
                    <div className="relative h-[400px] w-full overflow-hidden rounded-none sm:h-[500px] lg:h-[650px]">
                        <img
                            src={displayStoryData.background_image}
                            alt="1971 story visual"
                            className="absolute inset-0 h-full w-full object-cover object-center"
                        />
                        {/* Black Overlay Layer */}
                        <div className="absolute inset-0 bg-black/40" />
                        
                        {/* Title positioned over the image */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                            <h2 className="font-serif text-[1.5rem] font-bold leading-tight text-white sm:text-[2.2rem]">
                                {displayStoryData.title}
                            </h2>
                        </div>
                    </div>

                    {/* Text Content */}
                    <div className="px-1 sm:px-2 lg:px-0">
                         <h2 className="font-serif text-[clamp(2rem,4.3vw,3.2rem)] uppercase tracking-[0.06em] text-zinc-900">
                            {displayStoryData.section_title}
                        </h2>

                        <div
                            className="story-rich-text font-monstrate mt-8 space-y-6 text-[1.08rem] leading-[1.85] text-slate-700 sm:text-[1.15rem]"
                            dangerouslySetInnerHTML={{
                                __html: displayStoryData.description_html,
                            }}
                        />
                    </div>
                </article>
            </div>
        </section>
    );
}