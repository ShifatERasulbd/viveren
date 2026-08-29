import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { resolveOrderLineItems, resolveOrderSummaryFields } from './orderDisplay';

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

export default function JoorOrderForm({ form, order, orderItems = [], orderItemsError, isLoadingOrderItems, onChange, onSubmit, onCancel, isSubmitting, errors, submitLabel, showDoor }) {
    function handleField(name) {
        return (event) => onChange(name, event.target.value);
    }

    const lineItems = orderItems.length > 0 ? orderItems : (order ? resolveOrderLineItems(order) : []);
    const summaryFields = order ? resolveOrderSummaryFields(order) : [];

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            {order && (
                <Section title="Full Order Details (from JOOR)" description="Read-only data as returned by JOOR; edit the fields further down to update the order.">
                    {order.portal_url && (
                        <a
                            href={order.portal_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mb-4 inline-flex text-sm font-medium text-primary underline"
                        >
                            View full products summary in JOOR →
                        </a>
                    )}
                    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                        {summaryFields.map((field) => (
                            <div key={field.label}>
                                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{field.label}</p>
                                <p className="mt-1 break-words text-sm text-zinc-900">{field.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-5">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Products / Color / Size</p>
                        {isLoadingOrderItems ? (
                            <p className="text-xs text-zinc-400">Loading products, colors, and sizes…</p>
                        ) : lineItems.length > 0 ? (
                            <div className="overflow-x-auto rounded-md border border-zinc-200">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                                        <tr>
                                            <th className="px-3 py-2">Product</th>
                                            <th className="px-3 py-2">Color</th>
                                            <th className="px-3 py-2">Size</th>
                                            <th className="px-3 py-2">Qty</th>
                                            <th className="px-3 py-2">Unit Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lineItems.map((item) => (
                                            <tr key={item.key} className="border-t border-zinc-100">
                                                <td className="px-3 py-2">{item.name}</td>
                                                <td className="px-3 py-2">{item.color}</td>
                                                <td className="px-3 py-2">{item.size}</td>
                                                <td className="px-3 py-2">{item.quantity}</td>
                                                <td className="px-3 py-2">{item.unitPrice}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-xs text-zinc-400">
                                {orderItemsError || "JOOR didn't return any product/color/size line items for this order — use the \"View full products summary in JOOR\" link above to see the products, colors, sizes, and quantities on the order."}
                            </p>
                        )}
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
