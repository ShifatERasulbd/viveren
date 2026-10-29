import { useState } from 'react';

import { resizedImageSrcSet } from '../utils/imageVariants';

// <img> that lets the browser pick a downsized copy that fits `sizes`,
// and falls back to the full-size original if that copy doesn't exist yet.
export default function ResponsiveImage({ src, sizes = '100vw', onError, alt = '', ...props }) {
    const [failedSrc, setFailedSrc] = useState('');
    const srcSet = failedSrc === src ? '' : resizedImageSrcSet(src);

    return (
        <img
            {...props}
            src={src}
            alt={alt}
            srcSet={srcSet || undefined}
            sizes={srcSet ? sizes : undefined}
            onError={(event) => {
                if (srcSet) {
                    setFailedSrc(src);
                    return;
                }
                onError?.(event);
            }}
        />
    );
}
