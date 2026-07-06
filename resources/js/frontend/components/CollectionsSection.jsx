import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { timelessFontClass } from '../utils/typography';
import { sectionTypography } from '../utils/sectionTypography';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
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

function CollectionCardSkeleton() {
    return (
        <div className="aspect-[3/4] w-full animate-pulse bg-zinc-200" />
    );
}

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
            {/* Name moved outside the image container to be below it */}
            <div className="mt-4">
                <span className="text-[1.1rem] italic text-zinc-900">
                    {name}
                </span>
            </div>
        </Link>
    );
}

function reorderItems(items, sourceIndex, targetIndex) {
    if (
        !Array.isArray(items) ||
        sourceIndex === targetIndex ||
        sourceIndex < 0 ||
        targetIndex < 0 ||
        sourceIndex >= items.length ||
        targetIndex >= items.length
    ) {
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
        try {
            return window.self !== window.top;
        } catch {
            return false;
        }
    });

    useEffect(() => {
        if (isBuilderPreview) {
            setLoadStatus('ready');
        }
    }, [isBuilderPreview]);

    useEffect(() => {
        if (!isBuilderPreview) return;

        function handleBuilderPreviewMessage(event) {
            if (event.origin !== window.location.origin) return;

            const data = event.data;
            if (!data || data.type !== 'Viveren') return;

            setPreviewOverride((previous) => ({
                ...(previous || {}),
                ...(data.payload || {}),
            }));
            setLoadStatus('ready');
        }

        window.addEventListener('message', handleBuilderPreviewMessage);

        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                { type: 'Viveren' },
                window.location.origin
            );
        }

        return () => window.removeEventListener('message', handleBuilderPreviewMessage);
    }, [isBuilderPreview]);

    useEffect(() => {
        if (isBuilderPreview) return;

        let ignore = false;

        async function loadPublicCollections() {
            try {
                const response = await fetch('/api/public/collections', {
                    headers: { Accept: 'application/json' },
                });

                if (!response.ok) {
                    if (!ignore) setLoadStatus('error');
                    return;
                }

                const payload = await response.json();
                if (!ignore && payload?.section && Array.isArray(payload?.items)) {
                    setDbData({
                        title: payload.section.title,
                        titlePosition: payload.section.titlePosition,
                        itemsPerView: Number(payload.section.itemsPerView) || 4,
                        items: payload.items
                            .slice()
                            .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
                            .map((item) => ({
                                id: item.id,
                                name: item.name,
                                slug: item.slug,
                                image: item.image || null,
                            })),
                    });
                    setLoadStatus('ready');
                } else if (!ignore) {
                    setLoadStatus('error');
                }
            } catch {
                if (!ignore) setLoadStatus('error');
            }
        }

        loadPublicCollections();
        return () => { ignore = true; };
    }, [isBuilderPreview]);

    const displayData = useMemo(() => {
        const base = dbData || { title: 'Collections', titlePosition: 'left', itemsPerView: 4, items: [] };
        return previewOverride ? { ...base, ...previewOverride } : base;
    }, [dbData, previewOverride]);

    const title = displayData.title || 'Collections';
    const titlePosition = displayData.titlePosition || 'left';
    const itemsPerView = Math.max(1, Math.min(6, Number(displayData.itemsPerView) || 4));
    const collections = Array.isArray(displayData.items) ? displayData.items : [];

    const titleAlignClass = TITLE_ALIGN_MAP[titlePosition] || 'text-left';
    const gridColumnsClass = GRID_COLUMNS_MAP[itemsPerView] || 'lg:grid-cols-4';
    const isLoading = !isBuilderPreview && loadStatus === 'loading';

    function handleSectionSelect() {
        if (!isBuilderPreview) return;
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                {
                    type: 'TIMLESS_PAGE_BUILDER_COLLECTIONS_SECTION_SELECTED',
                    payload: { itemIndex: null },
                },
                window.location.origin
            );
        }
    }

    function handleDragStart(index, event) {
        if (!isBuilderPreview) return;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
    }

    function handleDragOver(event) {
        if (!isBuilderPreview) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    function handleDrop(targetIndex, event) {
        if (!isBuilderPreview) return;
        event.preventDefault();

        const sourceIndex = Number(event.dataTransfer.getData('text/plain'));
        if (!Number.isInteger(sourceIndex) || sourceIndex === targetIndex) return;

        setPreviewOverride((previous) => {
            const sourceItems = previous?.items || dbData?.items || [];
            return {
                ...(previous || {}),
                items: reorderItems(sourceItems, sourceIndex, targetIndex),
            };
        });

        if (window.parent && window.parent !== window) {
            window.parent.postMessage(
                {
                    type: 'TIMLESS_PAGE_BUILDER_COLLECTIONS_ITEMS_REORDERED',
                    payload: { sourceIndex, targetIndex },
                },
                window.location.origin
            );
        }
    }

    // Scroll motion variants: Enter from far right (+150px) and exit to far left (-150px)
    const containerVariants = {
        hidden: { opacity: 0, x: 150 },
        visible: { 
            opacity: 1, 
            x: 0, 
            transition: { type: 'spring', stiffness: 50, damping: 14, mass: 0.8 } 
        },
        exit: { 
            opacity: 0, 
            x: -150, 
            transition: { ease: 'easeInOut', duration: 0.4 } 
        }
    };

    return (
    <section className={`${timelessFontClass} bg-white py-5 overflow-hidden`}>
            {/* Removed the max-width container wrapper to allow full-width */}
            <div className="mx-auto w-full max-w-[1800px] px-0"> 
                <Swiper
                    modules={[Navigation]}
                    navigation
                    spaceBetween={0} // Set to 0 if images should touch, or 8 for thin gaps
                    slidesPerView={1.5}
                    breakpoints={{
                        640: { slidesPerView: 3 },
                        1024: { slidesPerView: 4 }
                    }}
                    className="collections-swiper px-4" // Added side padding to swiper so arrows don't clip
                >
                    {collections.map((col, index) => (
                        <SwiperSlide key={col.id || index}>
                            <CollectionCard
                                name={col.name}
                                slug={col.slug}
                                image={col.image}
                                isBuilderPreview={isBuilderPreview}
                                index={index}
                            />
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
            
            <style>{`
                /* Ensure Swiper takes full width */
                .collections-swiper {
                    width: 100%;
                }
                
                /* Style the arrows to match image_84363b.jpg */
                .collections-swiper .swiper-button-next,
                .collections-swiper .swiper-button-prev {
                    color: #000;
                    background: transparent;
                    width: 40px;
                    height: 40px;
                }
                
                /* Adjust spacing for text */
                .collections-swiper .swiper-slide {
                    padding: 0 4px; /* Optional: adds tiny space between full-width items */
                }
            `}</style>
        </section>
    );
}