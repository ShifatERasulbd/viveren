import { useEffect, useRef, useState } from 'react';

// One frame size for every gallery item. Change here to resize all of them
// (e.g. 'aspect-square', 'aspect-[4/5]', 'aspect-[2/3]').
const FRAME = 'aspect-[3/4]';

// object-cover  = fills the frame (edges may be trimmed)
// object-contain = shows the whole image (may leave empty space)
const FIT = 'object-cover object-top';

function ZoomableGalleryImage({ image, index, isActive, isZoomed, zoomPosition, onSelect, onZoomMove }) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onMouseMove={(event) => {
                if (isZoomed) onZoomMove(event);
            }}
            className={`relative w-full overflow-hidden border-b border-zinc-200 bg-white transition-all duration-200 ${FRAME} ${
                isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
            } ${isActive ? 'ring-1 ring-inset ring-zinc-900' : 'hover:opacity-95'}`}
        >
            <img
                src={image}
                alt={`Product ${index + 1}`}
                className={`pointer-events-none absolute inset-0 block size-full ${FIT}`}
            />
            {isZoomed ? (
                <div
                    className="absolute inset-0 pointer-events-none bg-no-repeat"
                    style={{
                        backgroundImage: `url(${image})`,
                        backgroundSize: '200%',
                        backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    }}
                />
            ) : null}
        </div>
    );
}

function GalleryVideo({ src, placeholder }) {
    const [isReady, setIsReady] = useState(false);
    const videoRef = useRef(null);

    useEffect(() => {
        setIsReady(false);
    }, [src]);

    const handleCanPlay = () => {
        setIsReady(true);

        const playPromise = videoRef.current?.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                // Ignore autoplay interruptions (browser policy/network timing).
            });
        }
    };

    return (
        <div className={`relative w-full overflow-hidden border-b border-zinc-200 bg-white ${FRAME}`}>
            {!isReady && placeholder ? (
                <img
                    src={placeholder}
                    alt="Product preview"
                    className={`absolute inset-0 block size-full ${FIT}`}
                />
            ) : null}
            <video
                ref={videoRef}
                src={src}
                autoPlay
                loop
                muted
                playsInline
                controls
                onCanPlay={handleCanPlay}
                preload="metadata"
                className={`absolute inset-0 block size-full ${FIT} ${isReady ? 'opacity-100' : 'opacity-0'}`}
            />
        </div>
    );
}

export default function SingleProductMediaGallery({
    images,
    primaryVideo,
    selectedImage,
    onSelectImage,
}) {
    const safeImages = Array.isArray(images) && images.length > 0 ? images : [];
    const activeImage = selectedImage || safeImages[0];
    const videoPlaceholderImage = safeImages[0] || activeImage || '';

    // Tracks which single image box currently has in-place zoom enabled, plus its focus point.
    const [zoomedKey, setZoomedKey] = useState(null);
    const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });

    if (!primaryVideo && !activeImage) return null;

    const galleryItems = [
        ...(primaryVideo ? [{ type: 'video', key: 'video' }] : []),
        ...safeImages.slice(0, 6).map((image, index) => ({
            type: 'image',
            key: `${image}-${index}`,
            image,
            index,
        })),
    ];

    const leftColumnItems = galleryItems.filter((_, index) => index % 2 === 0);
    const rightColumnItems = galleryItems.filter((_, index) => index % 2 !== 0);

    const handleImageClick = (item) => {
        onSelectImage(item.image);
        setZoomedKey((current) => {
            if (current === item.key) return null;
            setZoomPosition({ x: 50, y: 50 });
            return item.key;
        });
    };

    const handleZoomMove = (event) => {
        const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
        const xPercent = Math.max(0, Math.min(100, ((event.clientX - left) / width) * 100));
        const yPercent = Math.max(0, Math.min(100, ((event.clientY - top) / height) * 100));
        setZoomPosition({ x: xPercent, y: yPercent });
    };

    const renderItem = (item) => {
        if (item.type === 'video') {
            return <GalleryVideo key={item.key} src={primaryVideo} placeholder={videoPlaceholderImage} />;
        }

        return (
            <ZoomableGalleryImage
                key={item.key}
                image={item.image}
                index={item.index}
                isActive={activeImage === item.image}
                isZoomed={zoomedKey === item.key}
                zoomPosition={zoomPosition}
                onSelect={() => handleImageClick(item)}
                onZoomMove={handleZoomMove}
            />
        );
    };

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 gap-0 border border-zinc-200 sm:grid-cols-2">
                <div className="border-zinc-200 sm:border-r">{leftColumnItems.map(renderItem)}</div>
                <div>{rightColumnItems.map(renderItem)}</div>
            </div>
        </div>
    );
}