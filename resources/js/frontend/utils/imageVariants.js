// Downsized WebP copies of uploads, written by `php artisan images:resize` and on product upload.
// Keep in sync with ImageUploadOptimizer::RESIZED_WIDTHS.
const VARIANT_WIDTHS = [480, 960, 2000];

// Returns the path below /uploads/ for images that have resized copies, or ''.
function uploadsRelativePath(src) {
    let path = String(src || '').trim().replace(/\\/g, '/');
    if (!path) return '';

    if (/^https?:\/\//i.test(path)) {
        try {
            const url = new URL(path);
            if (typeof window === 'undefined' || url.origin !== window.location.origin) return '';
            path = url.pathname;
        } catch {
            return '';
        }
    }

    path = `/${path.replace(/^\/+/, '')}`;

    // Spaces and commas would break the srcset syntax
    if (/[\s,]/.test(path) || !/^\/uploads\/(?!resized\/).+\.(jpe?g|png|webp)$/i.test(path)) return '';

    return path.slice('/uploads/'.length);
}

function variantUrl(relativePath, width) {
    return `/uploads/resized/${width}/${relativePath}.webp`;
}

export function resizedImageSrcSet(src) {
    const relativePath = uploadsRelativePath(src);
    return relativePath
        ? VARIANT_WIDTHS.map((width) => `${variantUrl(relativePath, width)} ${width}w`).join(', ')
        : '';
}

// Smallest copy that still looks sharp at `displayWidth` CSS pixels on this screen, or '' if none exists.
export function resizedImageUrl(src, displayWidth) {
    const relativePath = uploadsRelativePath(src);
    if (!relativePath) return '';

    const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const needed = displayWidth * pixelRatio;
    const width = VARIANT_WIDTHS.find((candidate) => candidate >= needed) || VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1];

    return variantUrl(relativePath, width);
}
