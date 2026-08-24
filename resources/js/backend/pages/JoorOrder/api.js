import { requestJson } from '@/lib/apiClient';

export async function fetchJoorOrders(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
            params.set(key, value);
        }
    });

    const query = params.toString();
    return requestJson(`/api/joor-orders${query ? `?${query}` : ''}`);
}

export async function createJoorOrder(data) {
    return requestJson('/api/joor-orders', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateJoorOrder(id, data) {
    return requestJson(`/api/joor-orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}
