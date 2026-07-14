import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { timelessFontClass } from '../utils/typography';

const HOME_BACKGROUND_PREVIEW_UPDATE_EVENT = 'TIMLESS_PAGE_BUILDER_HOME_BACKGROUND_PREVIEW_UPDATE';
const HOME_BACKGROUND_PREVIEW_REQUEST_EVENT = 'TIMLESS_PAGE_BUILDER_REQUEST_HOME_BACKGROUND_PREVIEW';

const FALLBACK_ITEMS = [
    {
        id: 1,
        image: '/uploads/heroes/images/hero1.webp',
        title: 'Built For Everyday Confidence',
        description:
            'Elevated essentials with clean cuts, durable fabrics, and a refined casualwear silhouette.',
        button_text: 'Explore The Drop',
        button_url: '/shop',
        show_button: true,
        sort_order: 0,
    },
];

function normalizeItems(payloadItems) {
    const source = Array.isArray(payloadItems) ? payloadItems : [];
    const mapped = source
        .map((item, index) => ({
            id: item?.id ?? index + 1,
            image: String(item?.image || '').trim(),
            title: String(item?.title || '').trim(),
            description: String(item?.description || '').trim(),
            button_text: String(item?.button_text || 'Explore The Drop').trim(),
            button_url: String(item?.button_url || '/shop').trim(),
            show_button: Boolean(item?.show_button),
            sort_order: Number.isFinite(Number(item?.sort_order)) ? Number(item.sort_order) : index,
        }))
        .filter((item) => item.image || item.title || item.description);

    if (mapped.length === 0) {
        return FALLBACK_ITEMS;
    }

    return mapped.sort((a, b) => a.sort_order - b.sort_order);
}

function resolveImageUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) {
        return '/uploads/heroes/images/hero1.webp';
    }

    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/') || raw.startsWith('data:')) {
        return raw;
    }

    return `/${raw.replace(/^\/+/, '')}`;
}

export default function HomeBackgroundImageSection() {
    const [dbData, setDbData] = useState(null);
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

        async function loadPublicHomeBackground() {
            try {
                const response = await fetch('/api/public/home-background-section', {
                    headers: { Accept: 'application/json' },
                });

                if (!response.ok) {
                    return;
                }

                const payload = await response.json();
                if (!ignore && payload && typeof payload === 'object') {
                    setDbData(payload);
                }
            } catch {
                // Keep fallback data.
            }
        }

        loadPublicHomeBackground();
        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        if (!isBuilderPreview) {
            return;
        }

        function handleBuilderPreviewMessage(event) {
            if (event.origin !== window.location.origin) {
                return;
            }

            const data = event.data;
            if (!data || data.type !== HOME_BACKGROUND_PREVIEW_UPDATE_EVENT) {
                return;
            }

            setPreviewOverride((previous) => ({
                ...(previous || {}),
                ...(data.payload || {}),
            }));
        }

        window.addEventListener('message', handleBuilderPreviewMessage);

        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                {
                    type: HOME_BACKGROUND_PREVIEW_REQUEST_EVENT,
                },
                window.location.origin,
            );
        }

        return () => {
            window.removeEventListener('message', handleBuilderPreviewMessage);
        };
    }, [isBuilderPreview]);

    const displayData = useMemo(() => {
        const base = dbData || { items: FALLBACK_ITEMS };
        return previewOverride ? { ...base, ...previewOverride } : base;
    }, [dbData, previewOverride]);

    const items = useMemo(() => normalizeItems(displayData?.items), [displayData?.items]);

    function handleSectionSelect(event) {
        if (!isBuilderPreview) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                {
                    type: 'TIMLESS_PAGE_BUILDER_HOME_BACKGROUND_SECTION_SELECTED',
                },
                window.location.origin,
            );
        }
    }

    return (
        <motion.section
            className={`${timelessFontClass} w-full bg-white`}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            onClick={handleSectionSelect}
        >
            <div className="grid grid-cols-1 md:grid-cols-2">
                {items.map((item) => (
                    <Link
                        key={item.id}
                        to={item.button_url || '/shop'}
                        className="group relative block aspect-[2/1] overflow-hidden bg-zinc-100"
                        onClick={(event) => {
                            if (isBuilderPreview) {
                                event.preventDefault();
                            }
                        }}
                    >
                        <img
                            src={resolveImageUrl(item.image)}
                            alt={item.title || 'Home background item'}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="lazy"
                        />

                        <div className="absolute inset-0 flex flex-col justify-end bg-black/20 p-8 md:p-12">
                            <div className="w-fit max-w-[90%] bg-black/30 p-6 backdrop-blur-sm">
                                <h3 className="text-xl font-bold uppercase tracking-widest text-white md:text-2xl">
                                    {item.title || 'Untitled Slide'}
                                </h3>

                              

                                {item.show_button ? (
                                    <span className="mt-3 block text-sm font-semibold uppercase tracking-[0.2em] text-white/90 underline decoration-1 underline-offset-4">
                                        {item.button_text || 'SHOP NOW'}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </motion.section>
    );
}