// Shared JOOR order form model + payload builder used by both the create and edit pages.
// Flat, prefixed keys mirror the JOOR create/update order schema so they're easy to bind to
// plain <Input> fields, then get reassembled into the nested objects JOOR expects on submit.

export const emptyOrderForm = {
    status: 'IN_PROGRESS',
    po_number: '',
    customer_id: '',
    customer_code: '',
    price_type_id: '',
    price_type_name: '',
    collection_id: '',
    collection_code: '',

    customer_group_name: '',
    customer_group_code: '',
    company_number_name: '',
    company_number_code: '',

    shipping_address_id: '',
    shipping_address_code: '',
    shipping_price: '',
    billing_address_id: '',
    billing_address_code: '',
    shipping_method_id: '',
    shipping_method_code: '',
    tracking_number: '',

    useCustomShippingAddress: false,
    custom_shipping_name: '',
    custom_shipping_company: '',
    custom_shipping_line1: '',
    custom_shipping_line2: '',
    custom_shipping_city: '',
    custom_shipping_state: '',
    custom_shipping_zip: '',
    custom_shipping_country: '',
    custom_shipping_phone: '',
    custom_shipping_fax: '',
    custom_shipping_email: '',

    useCustomBillingAddress: false,
    custom_billing_name: '',
    custom_billing_company: '',
    custom_billing_line1: '',
    custom_billing_line2: '',
    custom_billing_city: '',
    custom_billing_state: '',
    custom_billing_zip: '',
    custom_billing_country: '',
    custom_billing_phone: '',

    sales_rep_id: '',
    sales_rep_code: '',
    payment_method_id: '',
    payment_method_code: '',

    delivery_window_start: '',
    delivery_window_end: '',
};

const CORE_FLAT_FIELDS = [
    'status', 'po_number', 'customer_id', 'customer_code', 'price_type_id', 'price_type_name',
    'collection_id', 'collection_code',
    'shipping_address_id', 'shipping_address_code', 'shipping_price',
    'billing_address_id', 'billing_address_code',
    'shipping_method_id', 'shipping_method_code', 'tracking_number',
    'sales_rep_id', 'sales_rep_code', 'payment_method_id', 'payment_method_code',
    'delivery_window_start', 'delivery_window_end',
];

function pickNonEmpty(values) {
    const result = {};
    Object.entries(values).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
            result[key] = value;
        }
    });
    return Object.keys(result).length > 0 ? result : null;
}

/**
 * Reassembles the flat form state into the nested payload JOOR's create/update
 * order endpoints expect.
 */
export function buildNestedOrderPayload(form, { includeDoor = false } = {}) {
    const payload = {};

    CORE_FLAT_FIELDS.forEach((key) => {
        if (form[key] !== '' && form[key] !== null && form[key] !== undefined) {
            payload[key] = form[key];
        }
    });

    if (form.useCustomShippingAddress) {
        const customShipping = pickNonEmpty({
            name: form.custom_shipping_name,
            company: form.custom_shipping_company,
            line1: form.custom_shipping_line1,
            line2: form.custom_shipping_line2,
            city: form.custom_shipping_city,
            state: form.custom_shipping_state,
            zip: form.custom_shipping_zip,
            country: form.custom_shipping_country,
            phone: form.custom_shipping_phone,
            fax: form.custom_shipping_fax,
            email: form.custom_shipping_email,
        });
        if (customShipping) payload.custom_shipping_address = customShipping;
    }

    if (form.useCustomBillingAddress) {
        const customBilling = pickNonEmpty({
            name: form.custom_billing_name,
            company: form.custom_billing_company,
            line1: form.custom_billing_line1,
            line2: form.custom_billing_line2,
            city: form.custom_billing_city,
            state: form.custom_billing_state,
            zip: form.custom_billing_zip,
            country: form.custom_billing_country,
            phone: form.custom_billing_phone,
        });
        if (customBilling) payload.custom_billing_address = customBilling;
    }

    const customerGroup = pickNonEmpty({ name: form.customer_group_name, code: form.customer_group_code });
    if (customerGroup) payload.customer_group = customerGroup;

    const companyNumber = pickNonEmpty({ name: form.company_number_name, code: form.company_number_code });
    if (companyNumber) payload.company_number = companyNumber;

    // "door" is only accepted by JOOR's update-order endpoint, not create.
    if (includeDoor) {
        const door = pickNonEmpty({ id: form.door_id, code: form.door_code, name: form.door_name });
        if (door) payload.door = door;
    }

    return payload;
}

// The GET /orders response nests references (customer, price_type, etc.) while
// create/update expect flat fields — map the former into the latter for the edit form.
export function mapOrderToForm(order) {
    return {
        ...emptyOrderForm,
        status: order.status || 'IN_PROGRESS',
        po_number: order.po_number || '',
        customer_id: order.customer?.id || '',
        customer_code: order.customer?.code || '',
        price_type_id: order.price_type?.id || '',
        price_type_name: order.price_type?.name || '',
        collection_id: order.collection?.id || '',
        collection_code: order.collection?.code || '',

        customer_group_name: order.customer_group?.name || '',
        customer_group_code: order.customer_group?.code || '',
        company_number_name: order.company_number?.name || '',
        company_number_code: order.company_number?.code || '',

        shipping_address_id: order.shipping_address?.id || '',
        shipping_address_code: order.shipping_address?.code || '',
        shipping_price: order.shipping_address?.price || '',
        billing_address_id: order.billing_address?.id || '',
        billing_address_code: order.billing_address?.code || '',
        shipping_method_id: order.shipping_method?.id || '',
        shipping_method_code: order.shipping_method?.code || '',
        tracking_number: order.tracking_number || '',

        sales_rep_id: order.sales_representative?.id || '',
        sales_rep_code: order.sales_representative?.code || '',
        payment_method_id: order.payment_method?.id || '',
        payment_method_code: order.payment_method?.code || '',

        delivery_window_start: (order.delivery_window_start || '').slice(0, 10),
        delivery_window_end: (order.delivery_window_end || '').slice(0, 10),
    };
}