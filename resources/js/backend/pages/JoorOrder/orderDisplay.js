// Shared read-only display helpers for JOOR order data, used by both the orders list
// and the create/edit form's retailer & line-item summary panel.

// JOOR doesn't always populate every retailer field for a given account, so fall back
// through the identifiers it does return until we find a usable label.
export function resolveRetailerName(order) {
    const customer = order?.customer || {};
    return (
        customer.name
        || customer.buyer_name
        || order?.buyer?.name
        || customer.code
        || (customer.id ? `Retailer #${customer.id}` : '-')
    );
}

export function formatAddress(address) {
    if (!address || typeof address !== 'object') return '';
    const line = [address.line1, address.line2].filter(Boolean).join(', ');
    const cityState = [address.city, address.state].filter(Boolean).join(', ');
    const cityStateZip = [cityState, address.zip].filter(Boolean).join(' ');
    return [address.name, address.company, line, cityStateZip, address.country]
        .filter((part) => typeof part === 'string' && part.trim() !== '')
        .join(', ');
}

export function formatTotal(order) {
    if (order?.total === null || order?.total === undefined || order?.total === '') return '-';
    const amount = Number(order.total);
    if (Number.isNaN(amount)) return String(order.total);
    const currency = order?.price_type?.currency;
    try {
        return new Intl.NumberFormat('en-US', currency ? { style: 'currency', currency } : undefined).format(amount);
    } catch {
        return amount.toFixed(2);
    }
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function orDash(value) {
    return value === null || value === undefined || value === '' ? '-' : value;
}

// Every field JOOR's GET /orders response returns, laid out for a full read-only
// "order details" panel — not just the handful of columns shown in the list view.
export function resolveOrderSummaryFields(order) {
    if (!order) return [];

    return [
        { label: 'JOOR Order ID', value: orDash(order.id) },
        { label: 'PO Number', value: orDash(order.po_number) },
        { label: 'Status', value: orDash(order.status) },
        { label: 'Retailer', value: resolveRetailerName(order) },
        { label: 'Retailer ID', value: orDash(order.customer?.id) },
        { label: 'Buyer', value: order.buyer?.name || order.buyer?.email || '-' },
        { label: 'Door', value: order.door?.name || order.door?.code || order.door?.id || '-' },
        { label: 'Customer Group', value: order.customer_group?.name || order.customer_group?.code || '-' },
        { label: 'Company Number', value: order.company_number?.name || order.company_number?.code || '-' },
        { label: 'Sales Representative', value: order.sales_representative?.username || order.sales_representative?.code || order.sales_representative?.id || '-' },
        { label: 'Payment Method', value: order.payment_method?.name || order.payment_method?.code || '-' },
        { label: 'Shipping Method', value: order.shipping_method?.name || order.shipping_method?.code || '-' },
        { label: 'Shipping Address', value: formatAddress(order.shipping_address) || '-' },
        { label: 'Billing Address', value: formatAddress(order.billing_address) || '-' },
        { label: 'Tracking Number', value: orDash(order.tracking_number) },
        { label: 'Warehouse', value: order.warehouse?.name || order.warehouse?.code || '-' },
        { label: 'Collection', value: order.collection?.name || order.collection?.code || '-' },
        { label: 'Season', value: order.season?.id || order.season?.code || '-' },
        { label: 'Price Type', value: order.price_type?.name || order.price_type?.currency || '-' },
        { label: 'Total', value: formatTotal(order) },
        { label: 'Quantity', value: orDash(order.quantity) },
        { label: 'Discount', value: order.discount?.discount ? String(order.discount.discount) : '-' },
        { label: 'Tax', value: (order.tax?.amount !== null && order.tax?.amount !== undefined) ? `${order.tax.amount} ${order.tax.label || ''}`.trim() : '-' },
        { label: 'Delivery Window', value: order.delivery_window_start ? `${formatDate(order.delivery_window_start)} → ${formatDate(order.delivery_window_end)}` : '-' },
        { label: 'Date Created', value: formatDate(order.date_created) },
        { label: 'Date Approved', value: formatDate(order.date_approved) },
        { label: 'Date Modified', value: formatDate(order.date_modified) },
        { label: 'Export Status', value: orDash(order.export_status) },
        { label: 'Exported On', value: order.exported_on ? formatDate(order.exported_on) : '-' },
        { label: 'Order Source', value: order.event?.event || order.event?.code || '-' },
        { label: 'Order Type', value: order.type?.name || order.type?.code || '-' },
        { label: 'Author', value: order.author?.username || order.author?.email || '-' },
        { label: 'Comments', value: orDash(order.comments) },
        { label: 'Internal Comments', value: orDash(order.internal_comments) },
    ];
}

// JOOR's GET /orders response (verified against the sandbox API) doesn't include a
// per-order line-item/SKU array — only a header-level `quantity` total. This defensively
// reads a handful of plausible keys in case a given account/response does include them,
// and normalizes color/size out of `trait_values` (the shape JOOR uses on /skus/bulk_create).
export function resolveOrderLineItems(order) {
    const candidates = order?.skus || order?.line_items || order?.order_lines || order?.products || [];
    if (!Array.isArray(candidates)) return [];

    return candidates.map((item, index) => {
        const traits = Array.isArray(item?.trait_values) ? item.trait_values : [];
        const findTrait = (needle) => traits.find((t) => String(t?.trait_name || t?.name || '').toLowerCase().includes(needle))?.value;

        return {
            key: item?.id || item?.external_id || index,
            name: item?.product?.name || item?.name || item?.external_id || item?.sku_identifier || '-',
            color: item?.color || findTrait('color') || '-',
            size: item?.size || findTrait('size') || '-',
            quantity: item?.quantity ?? '-',
            unitPrice: item?.unit_price ?? item?.wholesale_value ?? '-',
        };
    });
}

// Normalizes the JOOR v4 `GET /orders/sku_line_items` response (verified against the
// sandbox API) into flat product/color/size/quantity/price display rows.
export function resolveOrderItemsFromDetails(body) {
    const items = body?.data;
    if (!Array.isArray(items)) return [];

    return items
        .filter((item) => !item?.cancelled)
        .map((item, index) => {
            const sku = item?.line_item_sku || {};
            const traits = Array.isArray(sku.trait_values) ? sku.trait_values : [];
            const findTrait = (needle) => traits.find((t) => String(t?.trait?.name || '').toLowerCase() === needle)?.value;

            return {
                key: item?.id || index,
                name: sku.product?.name || sku.product?.identifier || sku.product?.external_id || '-',
                color: findTrait('color') || '-',
                size: findTrait('size') || '-',
                quantity: item?.quantity ?? '-',
                unitPrice: sku.item_price ?? sku.wholesale_price ?? '-',
            };
        });
}


