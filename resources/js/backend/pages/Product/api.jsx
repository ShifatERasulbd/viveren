import { requestJson } from '@/lib/apiClient';

function buildProductPayload(data = {}) {
    return {
        name: data.name?.trim() || '',
        slug: data.slug?.trim() || '',
        sku: data.sku?.trim() || '',
        color: data.color?.trim() || '',
        size: data.size?.trim() || '',
        description: data.description?.trim() || '',
        fit: data.fit || '',
        fabric_and_care: data.fabric_and_care || '',
        product_features: Array.isArray(data.product_features) ? data.product_features : [],
        product_composition: data.product_composition || '',
        long_description: data.long_description || '',
        additional_information: data.additional_information || '',
        cover_image: data.cover_image?.trim() || '',
        size_chart_image: data.size_chart_image?.trim() || '',
        size_chart_images: Array.isArray(data.size_chart_images) ? data.size_chart_images : [],
        category_id: data.category_id ? Number(data.category_id) : null,
        subcategory_id: data.subcategory_id ? Number(data.subcategory_id) : null,
        grand_child_id: data.grand_child_id ? Number(data.grand_child_id) : null,
        price: data.price === '' ? 0 : Number(data.price),
        discount_price: data.discount_price === '' ? 0 : Number(data.discount_price),
        stock: data.stock === '' ? 0 : Number(data.stock),
        show_on_best_sellers: Boolean(data.show_on_best_sellers),
        variant_rows: Array.isArray(data.variant_rows) ? data.variant_rows : [],
        color_variant_images:
            data.color_variant_images && typeof data.color_variant_images === 'object'
                ? data.color_variant_images
                : {},
        color_variant_videos:
            data.color_variant_videos && typeof data.color_variant_videos === 'object'
                ? data.color_variant_videos
                : {},
        color_variant_size_charts:
            data.color_variant_size_charts && typeof data.color_variant_size_charts === 'object'
                ? data.color_variant_size_charts
                : {},
        image_gallery_existing: Array.isArray(data.image_gallery_existing) ? data.image_gallery_existing : [],
        clear_gallery: Boolean(data.clear_gallery),
        product_videos_existing: Array.isArray(data.product_videos_existing) ? data.product_videos_existing : [],
        clear_videos: Boolean(data.clear_videos),
        size_chart_images_existing: Array.isArray(data.size_chart_images_existing) ? data.size_chart_images_existing : [],
        clear_size_charts: Boolean(data.clear_size_charts),
    };
}

function isFileLike(value) {
    return typeof File !== 'undefined' && value instanceof File;
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

function loadImageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to decode image'));
        image.src = dataUrl;
    });
}

async function optimizeImageFile(file) {
    if (!isFileLike(file) || !file.type.startsWith('image/')) {
        return file;
    }

    if (file.size <= 1024 * 1024) {
        return file;
    }

    try {
        const dataUrl = await readFileAsDataUrl(file);
        const image = await loadImageFromDataUrl(dataUrl);
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const width = Math.max(1, Math.floor(image.width * scale));
        const height = Math.max(1, Math.floor(image.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
            return file;
        }

        context.drawImage(image, 0, 0, width, height);

        const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/webp', 0.8);
        });

        if (!blob) {
            return file;
        }

        return new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
            type: 'image/webp',
            lastModified: Date.now(),
        });
    } catch (error) {
        console.warn('Image optimization failed, sending original file instead.', error);
        return file;
    }
}

async function buildProductFormData(data = {}) {
    const payload = buildProductPayload(data);
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            return;
        }
        if (Array.isArray(value) || (value && typeof value === 'object')) {
            if (Array.isArray(value) && value.length === 0) {
                return;
            }
            if (!Array.isArray(value) && Object.keys(value).length === 0) {
                return;
            }
            formData.append(key, JSON.stringify(value));
            return;
        }
        if (typeof value === 'boolean') {
            formData.append(key, value ? '1' : '0');
            return;
        }
        formData.append(key, String(value));
    });

    const thumbnailImageFile = isFileLike(data.thumbnailImageFile)
        ? await optimizeImageFile(data.thumbnailImageFile)
        : null;
    const sizeChartImageFile = isFileLike(data.sizeChartImageFile)
        ? await optimizeImageFile(data.sizeChartImageFile)
        : null;
    const sizeChartImageFiles = Array.isArray(data.sizeChartImageFiles)
        ? await Promise.all(data.sizeChartImageFiles.map((file) => optimizeImageFile(file)))
        : [];
    const galleryImageFiles = Array.isArray(data.galleryImageFiles)
        ? await Promise.all(data.galleryImageFiles.map((file) => optimizeImageFile(file)))
        : [];

    if (thumbnailImageFile) {
        formData.append('thumbnail_image', thumbnailImageFile);
    }

    if (sizeChartImageFile) {
        formData.append('size_chart_image_file', sizeChartImageFile);
    }

    sizeChartImageFiles.forEach((file) => {
        if (isFileLike(file)) {
            formData.append('size_chart_files[]', file);
        }
    });

    galleryImageFiles.forEach((file) => {
        if (isFileLike(file)) {
            formData.append('image_gallery[]', file);
        }
    });

    if (Array.isArray(data.productVideoFiles)) {
        data.productVideoFiles.forEach((file) => {
            if (isFileLike(file)) {
                formData.append('product_videos[]', file);
            }
        });
    }

    return formData;
}

function hasUploadFiles(data = {}) {
    const hasThumbnail = data.thumbnailImageFile instanceof File;
    const hasSizeChart = data.sizeChartImageFile instanceof File;
    const hasMultiSizeCharts = Array.isArray(data.sizeChartImageFiles) && data.sizeChartImageFiles.some((file) => file instanceof File);
    const hasGallery = Array.isArray(data.galleryImageFiles) && data.galleryImageFiles.some((file) => file instanceof File);
    const hasVideos = Array.isArray(data.productVideoFiles) && data.productVideoFiles.some((file) => file instanceof File);
    return hasThumbnail || hasSizeChart || hasMultiSizeCharts || hasGallery || hasVideos;
}

export async function fetchProducts() {
    const payload = await requestJson('/api/products');

    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    if (Array.isArray(payload?.items)) {
        return payload.items;
    }

    if (payload && typeof payload === 'object') {
        const numericKeyRows = Object.keys(payload)
            .filter((key) => /^\d+$/.test(key))
            .sort((a, b) => Number(a) - Number(b))
            .map((key) => payload[key])
            .filter((row) => row && typeof row === 'object');

        if (numericKeyRows.length > 0) {
            return numericKeyRows;
        }
    }

    return [];
}

export async function fetchProduct(id) {
    return await requestJson(`/api/products/${id}`);
}

export async function createProduct(data) {
    if (hasUploadFiles(data)) {
        const formData = await buildProductFormData(data);
        return requestJson('/api/products', {
            needsCsrf: true,
            method: 'POST',
            body: formData,
        });
    }

    return requestJson('/api/products', {
        needsCsrf: true,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildProductPayload(data)),
    });
}

export async function updateProduct(id, data) {
    if (hasUploadFiles(data)) {
        const formData = await buildProductFormData(data);
        formData.append('_method', 'PUT');
        return requestJson(`/api/products/${id}`, {
            needsCsrf: true,
            method: 'POST',
            body: formData,
        });
    }

    return requestJson(`/api/products/${id}`, {
        needsCsrf: true,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildProductPayload(data)),
    });
}

export async function deleteProduct(id, options = {}) {
    return requestJson(`/api/products/${id}`, {
        needsCsrf: true,
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            delete_scope: options.scope || 'single',
            group_name: options.groupName || '',
        }),
    });
}

export async function syncApiProducts() {
    return requestJson('/api/api-products/sync', {
        needsCsrf: true,
        method: 'POST',
    });
}

export async function reorderProducts(items = []) {
    return requestJson('/api/products/reorder', {
        needsCsrf: true,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            items: Array.isArray(items) ? items : [],
        }),
    });
}
