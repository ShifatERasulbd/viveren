import { useEffect, useRef, useState } from 'react';
import ProductZoomModal from './ProductZoomModal'; 

export default function SingleProductMediaGallery({
    images,
    primaryVideo,
    selectedImage,
    onSelectImage,
}) {
    const safeImages = Array.isArray(images) && images.length > 0 ? images : [];
    const activeImage = selectedImage || safeImages[0];
    const videoPlaceholderImage = safeImages[0] || activeImage || '';
    const [isVideoReady, setIsVideoReady] = useState(false);
    const videoRef = useRef(null);

    // Modal Control State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalImage, setModalImage] = useState('');

    useEffect(() => {
        setIsVideoReady(false);
    }, [primaryVideo]);

    if (!primaryVideo && !activeImage) return null;

    const handleImageClick = (image) => {
        onSelectImage(image);
        setModalImage(image);  
        setIsModalOpen(true);  
    };

    const handleVideoCanPlay = () => {
        setIsVideoReady(true);

        if (!videoRef.current) {
            return;
        }

        const playPromise = videoRef.current.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                // Ignore autoplay interruptions (browser policy/network timing).
            });
        }
    };

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 gap-0 border border-zinc-200 sm:grid-cols-2">
                {/* Primary Video Panel */}
                {primaryVideo ? (
                    <div className="relative overflow-hidden border-r border-zinc-200 bg-white">
                        {!isVideoReady && videoPlaceholderImage ? (
                            <img
                                src={videoPlaceholderImage}
                                alt="Product preview"
                                className="block h-auto w-full object-cover object-center"
                            />
                        ) : null}
                        <video
                            ref={videoRef}
                            src={primaryVideo}
                            autoPlay
                            loop
                            muted
                            playsInline
                            controls
                            onCanPlay={handleVideoCanPlay}
                            className={`block h-auto w-full object-cover object-center ${
                                isVideoReady ? 'opacity-100' : 'absolute inset-0 opacity-0'
                            }`}
                            preload="metadata"
                        />
                    </div>
                ) : null}

                {/* Product Images Loop */}
                {safeImages.slice(0, 6).map((image, index) => {
                    const isCurrentlyActive = activeImage === image;
                    return (
                        <div key={`${image}-${index}`} className="relative">
                            <button
                                type="button"
                                onClick={() => handleImageClick(image)}
                                className={`w-full cursor-zoom-in overflow-hidden border-b border-zinc-200 bg-white transition-all duration-200 sm:border-r ${
                                    isCurrentlyActive
                                        ? 'ring-1 ring-inset ring-zinc-900'
                                        : 'hover:opacity-95'
                                }`}
                            >
                                <img
                                    src={image}
                                    alt={`Product ${index + 1}`}
                                    className="pointer-events-none block h-auto w-full object-cover object-center"
                                />
                            </button>

                        </div>
                    );
                })}
            </div>

            {/* Modal Lightbox Viewport Component */}
            <ProductZoomModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                imageSrc={modalImage}
            />
        </div>
    );
}