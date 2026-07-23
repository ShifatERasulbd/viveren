import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { timelessFontClass } from '../utils/typography';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

function CollectionCard({ name, slug, image, isBuilderPreview, index }) {
    const routeSegment = String(slug || name || '').trim();
    const href = `/collection/${encodeURIComponent(routeSegment)}`;

    return (
        <Link to={href} className="group block h-full">
            <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100 border-x border-zinc-200">
                {image && (
                    <img 
                        src={image} 
                        alt={name} 
                        loading="lazy" 
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                )}
            </div>
            {/* Centered and increased font size */}
            <div className="mt-4 px-2 flex justify-center">
                <span className="text-[1.2rem] italic text-zinc-900">{name}</span>
            </div>
        </Link>
    );
}

export default function CollectionsSection() {
    const [previewOverride, setPreviewOverride] = useState(null);
    const [dbData, setDbData] = useState(null);
    const [isBuilderPreview] = useState(() => { try { return window.self !== window.top; } catch { return false; } });

    useEffect(() => {
        if (!isBuilderPreview) return;
        function handleBuilderPreviewMessage(event) {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'Viveren') setPreviewOverride(event.data.payload);
        }
        window.addEventListener('message', handleBuilderPreviewMessage);
        return () => window.removeEventListener('message', handleBuilderPreviewMessage);
    }, [isBuilderPreview]);

    useEffect(() => {
        if (isBuilderPreview) return;
        async function loadPublicCollections() {
            try {
                const response = await fetch('/api/public/collections', { headers: { Accept: 'application/json' } });
                const payload = await response.json();
                if (payload?.items) setDbData({ items: payload.items });
            } catch (e) { console.error(e); }
        }
        loadPublicCollections();
    }, [isBuilderPreview]);

    const collections = Array.isArray(dbData?.items) ? dbData.items : [];

    return (
        <section className={`${timelessFontClass} pt-2 pb-8 overflow-hidden w-full`}>
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-0">
                
                {/* Left Half Animation */}
                <motion.div
                    initial={{ opacity: 0, x: -80 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -80 }}
                    viewport={{ once: false, amount: 0.2 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full overflow-hidden"
                >
                    <Swiper
                        modules={[Navigation, Autoplay]}
                        navigation
                        loop={true}
                        speed={800}
                        autoplay={{ delay: 3000, disableOnInteraction: false }}
                        spaceBetween={0} 
                        slidesPerView={1.5}
                        breakpoints={{ 640: { slidesPerView: 2 }, 1024: { slidesPerView: 2 } }}
                        className="px-0"
                    >
                        {collections.slice(0, Math.ceil(collections.length / 2)).map((col, index) => (
                            <SwiperSlide key={col.id || index}>
                                <CollectionCard {...col} isBuilderPreview={isBuilderPreview} index={index} />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </motion.div>

                {/* Right Half Animation */}
                <motion.div
                    initial={{ opacity: 0, x: 80 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 80 }}
                    viewport={{ once: false, amount: 0.2 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full overflow-hidden"
                >
                    <Swiper
                        modules={[Navigation, Autoplay]}
                        navigation
                        loop={true}
                        speed={800}
                        autoplay={{ delay: 3000, disableOnInteraction: false }}
                        spaceBetween={0} 
                        slidesPerView={1.5}
                        breakpoints={{ 640: { slidesPerView: 2 }, 1024: { slidesPerView: 2 } }}
                        className="px-0"
                    >
                        {collections.slice(Math.ceil(collections.length / 2)).map((col, index) => (
                            <SwiperSlide key={col.id || index}>
                                <CollectionCard {...col} isBuilderPreview={isBuilderPreview} index={index} />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </motion.div>

            </div>
            
            <style>{`
                .swiper-button-next, .swiper-button-prev { color: #000 !important; }
            `}</style>
        </section>
    );
}