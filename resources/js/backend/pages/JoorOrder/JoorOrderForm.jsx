import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const STATUS_OPTIONS = ['IN_PROGRESS', 'NOTES', 'PENDING', 'APPROVED', 'SHIPPED', 'CANCELLED'];

function Field({ label, hint, error, children }) {
    return (
        <div>
            {label && (
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {label}
                </Label>
            )}
            {children}
            {hint && !error && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function Section({ title, description, children }) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
            {description && <p className="mb-4 mt-1 text-xs text-zinc-500">{description}</p>}
            <div className={description ? '' : 'mt-4'}>{children}</div>
        </div>
    );
}

export default function JoorOrderForm({ form, onChange, onSubmit, onCancel, isSubmitting, errors, submitLabel, showDoor }) {
    function handleField(name) {
        return (event) => onChange(name, event.target.value);
    }

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <Section title="Order Details">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Status" error={errors.status?.[0]}>
                        <select
                            value={form.status}
                            onChange={handleField('status')}
                            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="PO Number" error={errors.po_number?.[0]}>
                        <Input value={form.po_number} onChange={handleField('po_number')} />
                    </Field>

                    <Field label="Customer ID" hint="Either ID or Code is required" error={errors.customer_id?.[0]}>
                        <Input value={form.customer_id} onChange={handleField('customer_id')} />
                    </Field>
                    <Field label="Customer Code" error={errors.customer_code?.[0]}>
                        <Input value={form.customer_code} onChange={handleField('customer_code')} />
                    </Field>

                    <Field label="Price Type ID" hint="Either ID or Name is required" error={errors.price_type_id?.[0]}>
                        <Input value={form.price_type_id} onChange={handleField('price_type_id')} />
                    </Field>
                    <Field label="Price Type Name" error={errors.price_type_name?.[0]}>
                        <Input value={form.price_type_name} onChange={handleField('price_type_name')} />
                    </Field>

                    <Field label="Collection ID" hint="Either ID or Code is always required by JOOR" error={errors.collection_id?.[0]}>
                        <Input value={form.collection_id} onChange={handleField('collection_id')} />
                    </Field>
                    <Field label="Collection Code" error={errors.collection_code?.[0]}>
                        <Input value={form.collection_code} onChange={handleField('collection_code')} />
                    </Field>
                </div>
            </Section>

            <Section title="Customer Group & Company Number">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Customer Group Name"><Input value={form.customer_group_name} onChange={handleField('customer_group_name')} /></Field>
                    <Field label="Customer Group Code"><Input value={form.customer_group_code} onChange={handleField('customer_group_code')} /></Field>
                    <Field label="Company Number Name"><Input value={form.company_number_name} onChange={handleField('company_number_name')} /></Field>
                    <Field label="Company Number Code"><Input value={form.company_number_code} onChange={handleField('company_number_code')} /></Field>
                </div>
            </Section>

            <Section title="Shipping" description="Required (with billing) unless status is IN_PROGRESS.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Shipping Address ID" error={errors.shipping_address_id?.[0]}>
                        <Input value={form.shipping_address_id} onChange={handleField('shipping_address_id')} disabled={form.useCustomShippingAddress} />
                    </Field>
                    <Field label="Shipping Address Code" error={errors.shipping_address_code?.[0]}>
                        <Input value={form.shipping_address_code} onChange={handleField('shipping_address_code')} disabled={form.useCustomShippingAddress} />
                    </Field>
                    <Field label="Shipping Method ID" error={errors.shipping_method_id?.[0]}>
                        <Input value={form.shipping_method_id} onChange={handleField('shipping_method_id')} />
                    </Field>
                    <Field label="Shipping Method Code" error={errors.shipping_method_code?.[0]}>
                        <Input value={form.shipping_method_code} onChange={handleField('shipping_method_code')} />
                    </Field>
                    <Field label="Shipping Price" error={errors.shipping_price?.[0]}>
                        <Input value={form.shipping_price} onChange={handleField('shipping_price')} />
                    </Field>
                    <Field label="Tracking Number" error={errors.tracking_number?.[0]}>
                        <Input value={form.tracking_number} onChange={handleField('tracking_number')} />
                    </Field>
                </div>

                <label className="mt-4 flex items-center gap-2 text-xs font-medium text-zinc-600">
                    <Checkbox
                        checked={form.useCustomShippingAddress}
                        onCheckedChange={(checked) => onChange('useCustomShippingAddress', checked === true)}
                    />
                    Use a custom shipping address instead of an existing ID/code
                </label>

                {form.useCustomShippingAddress && (
                    <div className="mt-3 grid grid-cols-1 gap-4 rounded-md bg-zinc-50 p-4 sm:grid-cols-2">
                        <Field label="Name"><Input value={form.custom_shipping_name} onChange={handleField('custom_shipping_name')} /></Field>
                        <Field label="Company"><Input value={form.custom_shipping_company} onChange={handleField('custom_shipping_company')} /></Field>
                        <Field label="Address Line 1"><Input value={form.custom_shipping_line1} onChange={handleField('custom_shipping_line1')} /></Field>
                        <Field label="Address Line 2"><Input value={form.custom_shipping_line2} onChange={handleField('custom_shipping_line2')} /></Field>
                        <Field label="City"><Input value={form.custom_shipping_city} onChange={handleField('custom_shipping_city')} /></Field>
                        <Field label="State"><Input value={form.custom_shipping_state} onChange={handleField('custom_shipping_state')} /></Field>
                        <Field label="Zip"><Input value={form.custom_shipping_zip} onChange={handleField('custom_shipping_zip')} /></Field>
                        <Field label="Country"><Input value={form.custom_shipping_country} onChange={handleField('custom_shipping_country')} /></Field>
                        <Field label="Phone"><Input value={form.custom_shipping_phone} onChange={handleField('custom_shipping_phone')} /></Field>
                        <Field label="Fax"><Input value={form.custom_shipping_fax} onChange={handleField('custom_shipping_fax')} /></Field>
                        <Field label="Email"><Input type="email" value={form.custom_shipping_email} onChange={handleField('custom_shipping_email')} /></Field>
                    </div>
                )}
            </Section>

            <Section title="Billing">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Billing Address ID" error={errors.billing_address_id?.[0]}>
                        <Input value={form.billing_address_id} onChange={handleField('billing_address_id')} disabled={form.useCustomBillingAddress} />
                    </Field>
                    <Field label="Billing Address Code" error={errors.billing_address_code?.[0]}>
                        <Input value={form.billing_address_code} onChange={handleField('billing_address_code')} disabled={form.useCustomBillingAddress} />
                    </Field>
                </div>

                <label className="mt-4 flex items-center gap-2 text-xs font-medium text-zinc-600">
                    <Checkbox
                        checked={form.useCustomBillingAddress}
                        onCheckedChange={(checked) => onChange('useCustomBillingAddress', checked === true)}
                    />
                    Use a custom billing address instead of an existing ID/code
                </label>

                {form.useCustomBillingAddress && (
                    <div className="mt-3 grid grid-cols-1 gap-4 rounded-md bg-zinc-50 p-4 sm:grid-cols-2">
                        <Field label="Name"><Input value={form.custom_billing_name} onChange={handleField('custom_billing_name')} /></Field>
                        <Field label="Company"><Input value={form.custom_billing_company} onChange={handleField('custom_billing_company')} /></Field>
                        <Field label="Address Line 1"><Input value={form.custom_billing_line1} onChange={handleField('custom_billing_line1')} /></Field>
                        <Field label="Address Line 2"><Input value={form.custom_billing_line2} onChange={handleField('custom_billing_line2')} /></Field>
                        <Field label="City"><Input value={form.custom_billing_city} onChange={handleField('custom_billing_city')} /></Field>
                        <Field label="State"><Input value={form.custom_billing_state} onChange={handleField('custom_billing_state')} /></Field>
                        <Field label="Zip"><Input value={form.custom_billing_zip} onChange={handleField('custom_billing_zip')} /></Field>
                        <Field label="Country"><Input value={form.custom_billing_country} onChange={handleField('custom_billing_country')} /></Field>
                        <Field label="Phone"><Input value={form.custom_billing_phone} onChange={handleField('custom_billing_phone')} /></Field>
                    </div>
                )}
            </Section>

            <Section title="Sales & Payment">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Sales Rep ID" error={errors.sales_rep_id?.[0]}>
                        <Input value={form.sales_rep_id} onChange={handleField('sales_rep_id')} />
                    </Field>
                    <Field label="Sales Rep Code" error={errors.sales_rep_code?.[0]}>
                        <Input value={form.sales_rep_code} onChange={handleField('sales_rep_code')} />
                    </Field>

                    <Field label="Payment Method ID" error={errors.payment_method_id?.[0]}>
                        <Input value={form.payment_method_id} onChange={handleField('payment_method_id')} />
                    </Field>
                    <Field label="Payment Method Code" error={errors.payment_method_code?.[0]}>
                        <Input value={form.payment_method_code} onChange={handleField('payment_method_code')} />
                    </Field>

                    <Field label="Delivery Window Start" hint="YYYY-MM-DD" error={errors.delivery_window_start?.[0]}>
                        <Input type="date" value={form.delivery_window_start} onChange={handleField('delivery_window_start')} />
                    </Field>
                    <Field label="Delivery Window End" hint="YYYY-MM-DD" error={errors.delivery_window_end?.[0]}>
                        <Input type="date" value={form.delivery_window_end} onChange={handleField('delivery_window_end')} />
                    </Field>
                </div>
            </Section>

            {showDoor && (
                <Section title="Door" description="Only applies when updating an existing order.">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Door ID"><Input value={form.door_id} onChange={handleField('door_id')} /></Field>
                        <Field label="Door Code"><Input value={form.door_code} onChange={handleField('door_code')} /></Field>
                        <Field label="Door Name"><Input value={form.door_name} onChange={handleField('door_name')} /></Field>
                    </div>
                </Section>
            )}

            <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving…' : submitLabel}
                </Button>
            </div>
        </form>
    );
}
