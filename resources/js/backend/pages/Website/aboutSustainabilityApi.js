import { requestJson } from '@/lib/apiClient';

function normalizePoints(points = []) {
    if (!Array.isArray(points)) {
        return [];
    }

    return points
        .map((point) => String(point || '').trim())
        .filter((point) => point.length > 0);
}

function buildAboutSustainabilityFormData(data = {}) {
    const formData = new FormData();

    formData.append('section_title', data.section_title || 'Sustainability');
    formData.append('title', data.title || 'Responsibility, Built In');
    formData.append('description', data.description || '');
    formData.append('points', JSON.stringify(normalizePoints(data.points)));
    formData.append('button_title', data.button_title || 'Explore Our Sustainability Approach');
    formData.append('button_link', data.button_link || '#');
    formData.append('button_enabled', data.button_enabled ? '1' : '0');

    if (data.image instanceof File) {
        formData.append('image_file', data.image);
    } else if (typeof data.image === 'string' && data.image.length > 0) {
        formData.append('image', data.image);
    }

    return formData;
}

export async function fetchAboutSustainability() {
    return requestJson('/api/about-giving-back');
}

export async function fetchPublicAboutSustainability() {
    return requestJson('/api/public/about-giving-back');
}

export async function updateAboutSustainability(data) {
    return requestJson('/api/about-giving-back', {
        needsCsrf: true,
        method: 'POST',
        body: buildAboutSustainabilityFormData(data),
    });
}
