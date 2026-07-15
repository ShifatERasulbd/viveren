import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FadeInOutOnView from './FadeInOutOnView.jsx';

const FALLBACK_IMAGE = '/uploads/heroes/images/hero1.webp';

function toAbsoluteImageUrl(path) {
    if (!path || typeof path !== 'string') return FALLBACK_IMAGE;
    if (path.startsWith('http')) return path;
    return `/${path.replace(/^\/+/, '')}`;
}

function normalizeImageKey(path) {
    if (!path || typeof path !== 'string') return '';
    return path.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '').trim();
}

function resolveProductImage(product) {
    const gallery = Array.isArray(product?.image_gallery) ? product.image_gallery : [];
    const colorVariantImages = product?.color_variant_images && typeof product.color_variant_images === 'object'
        ? Object.values(product.color_variant_images).flatMap((items) => (Array.isArray(items) ? items : []))
        : [];

    const candidates = [product?.cover_image, ...gallery, ...colorVariantImages].filter(Boolean);
    const seen = new Set();

    for (const item of candidates) {
        const key = normalizeImageKey(item);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        return toAbsoluteImageUrl(item);
    }
    return FALLBACK_IMAGE;
}

function resolveProductCardFields(p) {
    const id = Number(p?.id);
    if (!Number.isFinite(id) || id <= 0) return null;
    const title = String(p?.name ?? p?.title ?? '').trim();
    const priceValue = p?.price ?? p?.final_price ?? p?.sale_price ?? p?.regular_price;
    const priceNumber = Number(priceValue);
    return {
        id,
        title: title || `Product ${id}`,
        price: Number.isFinite(priceNumber) ? priceNumber : 0,
        image: resolveProductImage(p),
    };
}

const FALLBACK_PRODUCTS = [
    { id: 1, title: 'Timeless Piece 1', price: 59 },
    { id: 2, title: 'Timeless Piece 2', price: 69 },
    { id: 3, title: 'Timeless Piece 3', price: 79 },
    { id: 4, title: 'Timeless Piece 4', price: 89 },
    { id: 5, title: 'Timeless Piece 5', price: 99 },
];

export default function TrendingProduct() {
    const [products, setProducts] = useState(() => FALLBACK_PRODUCTS);
    const [trendingImage, setTrendingImage] = useState('');
    const [radius, setRadius] = useState(620);
    const [cardWidth, setCardWidth] = useState(250);

    useEffect(() => {
        let ignore = false;
        async function loadTrending() {
            try {
                const response = await fetch('/api/public/products', { headers: { Accept: 'application/json' } });
                if (!response.ok) return;
                const payload = await response.json();
                const list = Array.isArray(payload?.products) ? payload.products : Array.isArray(payload) ? payload : [];
                const mapped = list.map(resolveProductCardFields).filter(Boolean);
                if (!ignore && mapped.length > 0) setProducts(mapped);
            } catch {}
        }
        loadTrending();
        return () => { ignore = true; };
    }, []);

    const extendedItems = useMemo(() => [...products, ...products, ...products], [products]);
    const totalItems = extendedItems.length;

    useEffect(() => {
        const updateCarousel = () => {
            const width = window.innerWidth;
            if (width >= 1600) { setRadius(720); setCardWidth(260); }
            else if (width >= 1400) { setRadius(660); setCardWidth(250); }
            else if (width >= 1200) { setRadius(600); setCardWidth(235); }
            else if (width >= 992) { setRadius(520); setCardWidth(220); }
            else if (width >= 768) { setRadius(440); setCardWidth(200); }
            else { setRadius(320); setCardWidth(170); }
        };
        updateCarousel();
        window.addEventListener('resize', updateCarousel);
        return () => window.removeEventListener('resize', updateCarousel);
    }, []);

    return (
        <FadeInOutOnView
            as="section"
            className="relative w-full overflow-hidden py-8"
            rootMargin="0px 0px -10% 0px"
            threshold={0.01}
            durationMs={700}
            yPx={10}
        >
            {trendingImage && (
                <div className="absolute inset-0 -z-10" style={{ opacity: 0.55, backgroundImage: `url(${trendingImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
            )}

            <h3 className="mb-12 text-center font-serif text-4xl text-zinc-900">
                Trending Products
            </h3>

            <div className="relative mx-auto flex h-[500px] md:h-[540px] lg:h-[560px] w-full max-w-[1700px] items-center justify-center overflow-hidden [perspective:1800px]">
                <div className="relative flex h-full w-full items-center justify-center [transform-style:preserve-3d] animate-[pause-roll_90s_linear_infinite]">
                    {extendedItems.map((p, i) => {
                        const rotation = i * (360 / totalItems);
                        return (
                            <Link
                                key={`${p.id}-${i}`}
                                to={`/product/${p.id}`}
                                className="absolute flex flex-col overflow-hidden rounded-[2rem] shadow-xl transition-all duration-300 hover:scale-105 bg-white"
                                style={{
                                    width: `${cardWidth}px`,
                                    transform: `rotateY(${rotation}deg) translateZ(${radius}px)`,
                                    backfaceVisibility: 'hidden',
                                }}
                            >
                                <div className="h-[220px] md:h-[255px] lg:h-[280px] w-full overflow-hidden bg-zinc-100">
                                    <img src={p.image || FALLBACK_IMAGE} alt={p.title} className="h-full w-full object-cover" />
                                </div>
                                <div className="space-y-1 px-4 pb-5 pt-4 text-center">
                                    <h3 className="line-clamp-2 text-[0.95rem] font-medium leading-[1.15] text-zinc-900 sm:text-[1.02rem]">{p.title}</h3>
                                    <p className="text-[1.2rem] font-semibold leading-none text-zinc-800 sm:text-[.95rem]">${Number(p.price).toFixed(2)}</p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <style>{`
                @keyframes pause-roll {
                    0%, 4.44% { transform: rotateY(0deg); } 6.66% { transform: rotateY(-24deg); } 6.66%, 11.1% { transform: rotateY(-24deg); } 13.33% { transform: rotateY(-48deg); } 13.33%, 17.77% { transform: rotateY(-48deg); } 20% { transform: rotateY(-72deg); } 20%, 24.44% { transform: rotateY(-72deg); } 26.66% { transform: rotateY(-96deg); } 26.66%, 31.11% { transform: rotateY(-96deg); } 33.33% { transform: rotateY(-120deg); } 33.33%, 37.77% { transform: rotateY(-120deg); } 40% { transform: rotateY(-144deg); } 40%, 44.44% { transform: rotateY(-144deg); } 46.66% { transform: rotateY(-168deg); } 46.66%, 51.11% { transform: rotateY(-168deg); } 53.33% { transform: rotateY(-192deg); } 53.33%, 57.77% { transform: rotateY(-192deg); } 60% { transform: rotateY(-216deg); } 60%, 64.44% { transform: rotateY(-216deg); } 66.66% { transform: rotateY(-240deg); } 66.66%, 71.11% { transform: rotateY(-240deg); } 73.33% { transform: rotateY(-264deg); } 73.33%, 77.77% { transform: rotateY(-264deg); } 80% { transform: rotateY(-288deg); } 80%, 84.44% { transform: rotateY(-288deg); } 86.66% { transform: rotateY(-312deg); } 86.66%, 91.11% { transform: rotateY(-312deg); } 93.33% { transform: rotateY(-336deg); } 93.33%, 97.77% { transform: rotateY(-336deg); } 100% { transform: rotateY(-360deg); }
                }
            `}</style>
        </FadeInOutOnView>
    );
}