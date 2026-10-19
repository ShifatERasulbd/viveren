import { requestJson } from '@/lib/apiClient';

export async function fetchOrders({ page = 1, perPage = 20, status = '', search = '' } = {}) {
    const params = new URLSearchParams({ page, per_page: perPage });
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    return requestJson(`/api/orders?${params.toString()}`);
}

export async function fetchOrder(id) {
    return requestJson(`/api/orders/${id}`);
}

export async function updateOrder(id, data) {
    return requestJson(`/api/orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteOrder(id) {
    return requestJson(`/api/orders/${id}`, { method: 'DELETE' });
}

export async function bulkUpdateOrders(ids, status) {
    return requestJson('/api/orders/bulk-update', {
        method: 'POST',
        body: JSON.stringify({ ids, status }),
    });
}

export async function bulkDeleteOrders(ids) {
    return requestJson('/api/orders/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
    });
}

export async function fetchCustomerOrders({ page = 1, perPage = 20, status = '', search = '', from = '', to = '' } = {}) {
    const params = new URLSearchParams({ page, per_page: perPage });
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return requestJson(`/api/customer/orders?${params.toString()}`);
}

export async function fetchCustomerRecentItems(limit = 2) {
    return requestJson(`/api/customer/orders/recent-items?limit=${limit}`);
}

export async function cancelCustomerOrder(id) {
    return requestJson(`/api/customer/orders/${id}/cancel`, {
        method: 'PUT',
    });
}


export async function fetchCustomerOrder(id) {
    return requestJson(`/api/customer/orders/${id}`);
}