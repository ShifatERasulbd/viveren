import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { timelessFontClass } from '../utils/typography';
import { sectionTypography } from '../utils/sectionTypography';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

const GRID_COLUMNS_MAP = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
};

const TITLE_ALIGN_MAP = {
    center: 'text-center',
    right: 'text-right',
    left: 'text-left',
};

function CollectionCard({ name, slug, image, isBuilderPreview, index }) {
    const routeSegment = String(slug || name || '').trim();
    const href = `/collection/${encodeURIComponent(routeSegment)}`;

    function handleSelectInBuilder(event) {
        if (!isBuilderPreview) return;
        event.preventDefault();
        event.stopPropagation();

        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                {
                    type: 'Viveren',
                    payload: { itemIndex: index },
                },
                window.location.origin
            );
        }
    }

    return (
        <Link to={href} className="group block" onClick={handleSelectInBuilder}>
            <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100">
                {image && (
                    <img
                        src={image}
                        alt={name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                )}
            </div>
            <div className="mt-2">
                <span className="text-[1rem] italic text-zinc-900">{name}</span>
            </div>
        </Link>
    );
}

function reorderItems(items, sourceIndex, targetIndex) {
    if (!Array.isArray(items) || sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0 || sourceIndex >= items.length || targetIndex >= items.length) {
        return items;
    }
    const next = [...items];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    return next;
}

export default function CollectionsSection() {
    const [previewOverride, setPreviewOverride] = useState(null);
    const [dbData, setDbData] = useState(null);
    const [loadStatus, setLoadStatus] = useState('loading');
    const [isBuilderPreview] = useState(() => {
        try { return window.self !== window.top; } catch { return false; }
    });

    useEffect(() => {
        if (isBuilderPreview) setLoadStatus('ready');
    }, [isBuilderPreview]);

    useEffect(() => {
        if (!isBuilderPreview) return;
        function handleBuilderPreviewMessage(event) {
            if (event.origin !== window.location.origin) return;
            const data = event.data;
            if (!data || data.type !== 'Viveren') return;
            setPreviewOverride((previous) => ({ ...(previous || {}), ...(data.payload || {}) }));
            setLoadStatus('ready');
        }
        window.addEventListener('message', handleBuilderPreviewMessage);
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'Viveren' }, window.location.origin);
        }
        return () => window.removeEventListener('message', handleBuilderPreviewMessage);
    }, [isBuilderPreview]);

    useEffect(() => {
        if (isBuilderPreview) return;
        let ignore = false;
        async function loadPublicCollections() {
            try {
                const response = await fetch('/api/public/collections', { headers: { Accept: 'application/json' } });
                if (!response.ok) { if (!ignore) setLoadStatus('error'); return; }
                const payload = await response.json();
                if (!ignore && payload?.section && Array.isArray(payload?.items)) {
                    setDbData({
                        title: payload.section.title,
                        titlePosition: payload.section.titlePosition,
                        itemsPerView: Number(payload.section.itemsPerView) || 4,
                        items: payload.items.slice().sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
                    });
                    setLoadStatus('ready');
                }
            } catch { if (!ignore) setLoadStatus('error'); }
        }
        loadPublicCollections();
        return () => { ignore = true; };
    }, [isBuilderPreview]);

    const displayData = useMemo(() => {
        const base = dbData || { title: 'Collections', titlePosition: 'left', itemsPerView: 4, items: [] };
        return previewOverride ? { ...base, ...previewOverride } : base;
    }, [dbData, previewOverride]);

    const collections = Array.isArray(displayData.items) ? displayData.items : [];

    return (
        <motion.section
            className={`${timelessFontClass} bg-white py-5 overflow-hidden`}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ amount: 0.2 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
        >
            <div className="mx-auto w-full max-w-[1800px] px-0">
                <Swiper
                    modules={[Navigation, Autoplay]}
                    navigation
                    loop={true}
                    loopedSlides={Math.max(1, collections.length)}
                    speed={1000}
                    autoplay={{ delay: 2500, disableOnInteraction: false, pauseOnMouseEnter: true }}
                    spaceBetween={0}
                    slidesPerView={1.5}
                    breakpoints={{ 640: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } }}
                    className="collections-swiper px-4"
                >
                    {collections.map((col, index) => (
                        <SwiperSlide key={col.id || index}>
                            <div className="w-full">
                                <CollectionCard
                                    name={col.name}
                                    slug={col.slug}
                                    image={col.image}
                                    isBuilderPreview={isBuilderPreview}
                                    index={index}
                                />
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
            
            <style>{`
                .collections-swiper { width: 100%; }
                .collections-swiper .swiper-button-next,
                .collections-swiper .swiper-button-prev { color: #000; background: transparent; width: 40px; height: 40px; }
                .collections-swiper .swiper-slide { padding: 0 4px; }
            `}</style>
        </motion.section>
    );
}