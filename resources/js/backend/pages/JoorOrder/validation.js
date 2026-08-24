const REQUIRED_EITHER_OR_PAIRS = [
    ['customer_id', 'customer_code', 'Customer ID or Customer Code is required.'],
    ['price_type_id', 'price_type_name', 'Price Type ID or Price Type Name is required.'],
    ['collection_id', 'collection_code', 'Collection ID or Collection Code is required.'],
];

// JOOR requires a shipping/billing address (an ID/code, or a custom address) unless
// the order is left in IN_PROGRESS.
const REQUIRED_UNLESS_IN_PROGRESS = [
    ['shipping_address_id', 'shipping_address_code', 'useCustomShippingAddress', 'Shipping Address ID or Code is required unless status is IN_PROGRESS (or use a custom shipping address).'],
    ['billing_address_id', 'billing_address_code', 'useCustomBillingAddress', 'Billing Address ID or Code is required unless status is IN_PROGRESS (or use a custom billing address).'],
];

export function validateJoorOrderForm(form) {
    const errors = {};

    REQUIRED_EITHER_OR_PAIRS.forEach(([idField, codeField, message]) => {
        if (!form[idField]?.trim() && !form[codeField]?.trim()) {
            errors[idField] = [message];
        }
    });

    if (form.status !== 'IN_PROGRESS') {
        REQUIRED_UNLESS_IN_PROGRESS.forEach(([idField, codeField, useCustomField, message]) => {
            if (!form[useCustomField] && !form[idField]?.trim() && !form[codeField]?.trim()) {
                errors[idField] = [message];
            }
        });
    }

    return errors;
}
