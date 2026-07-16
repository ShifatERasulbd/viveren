import { requestJson } from '@/lib/apiClient';

function buildFabricTechnologyFormData(data = {}) {
    const formData = new FormData();

    formData.append('section_title', data.section_title || 'Fabric & Technology');
    formData.append('title', data.title || 'Fabric, Engineered with Purpose');
    formData.append('description', data.description || '');
    formData.append('button_title', data.button_title || 'Discover Our Fabrics');
    formData.append('button_link', data.button_link || '#');
    formData.append('button_enabled', data.button_enabled ? '1' : '0');

    if (data.image instanceof File) {
        formData.append('image_file', data.image);
    } else if (typeof data.image === 'string' && data.image.length > 0) {
        formData.append('image', data.image);
    }

    return formData;
}

export async function fetchAboutFabricTechnology() {
    return requestJson('/api/about-fabric-technology');
}

export async function fetchPublicAboutFabricTechnology() {
    return requestJson('/api/public/about-fabric-technology');
}

export async function updateAboutFabricTechnology(data) {
    return requestJson('/api/about-fabric-technology', {
        needsCsrf: true,
        method: 'POST',
        body: buildFabricTechnologyFormData(data),
    });
}
