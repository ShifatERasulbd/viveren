import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Check, Package } from 'lucide-react';

import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppContext } from '@/context/AppContext';

import { cancelCustomerOrder, fetchCustomerOrder } from './api';
import { StatusBadge } from './shared';

const STEPS = ['pending', 'approved', 'processing', 'shipped', 'delivered'];
const CANCELLABLE = ['pending', 'approved', 'processing'];
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

function parseItems(items) {
    if (Array.isArray(items)) return items;
    if (typeof items === 'string') {
        try { return JSON.parse(items) || []; } catch { return []; }
    }
    return [];
}

function Card({ title, children, className = '' }) {
    return (
        <section className={`rounded-xl bg-white p-5 shadow-sm ${className}`}>
            {title && <h2 className="mb-3 text-base font-semibold text-zinc-900">{title}</h2>}
            {children}
        </section>
    );
}

function Row({ label, value, bold = false }) {
    return (
        <div className={`flex items-center justify-between py-1 text-sm ${bold ? 'font-semibold text-zinc-900' : 'text-zinc-600'}`}>
            <span>{label}</span>
            <span className={bold ? '' : 'text-zinc-800'}>{value}</span>
        </div>
    );
}

function Tracker({ status }) {
    if (status === 'cancelled' || status === 'refunded') {
        return (
            <div className={`rounded-lg px-4 py-3 text-sm font-medium ${status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-zinc-100 text-zinc-700'}`}>
                This order was {status}.
            </div>
        );
    }

    const current = Math.max(0, STEPS.indexOf(status));

    return (
        <ol className="flex items-center">
            {STEPS.map((step, i) => {
                const done = i <= current;
                return (
                    <li key={step} className="flex flex-1 items-center last:flex-none">
                        <div className="flex flex-col items-center gap-1">
                            <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                                    done ? 'bg-gradient-to-r from-[#2f4d73] to-[#1b2e4b] text-white' : 'bg-zinc-200 text-zinc-500'
                                }`}
                            >
                                {i < current ? <Check className="h-4 w-4" /> : i + 1}
                            </span>
                            <span className={`text-[11px] capitalize ${done ? 'text-zinc-900' : 'text-zinc-400'}`}>{step}</span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <span className={`mx-1 mb-4 h-0.5 flex-1 ${i < current ? 'bg-[#2f4d73]' : 'bg-zinc-200'}`} />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

export default function CustomerOrderDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { setPageTitle, user } = useAppContext();

    const [order, setOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    useEffect(() => { setPageTitle('Order Details'); }, [setPageTitle]);

    function load() {
        setIsLoading(true);
        return fetchCustomerOrder(id)
            .then((data) => { setOrder(data); setNotFound(false); })
            .catch((err) => {
                setNotFound(true);
                toast.error(err.message || 'Failed to load order');
            })
            .finally(() => setIsLoading(false));
    }

    useEffect(() => {
        if (user) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, user]);

    async function handleCancel() {
        setIsCancelling(true);
        try {
            await cancelCustomerOrder(id);
            toast.success('Order cancelled');
            setConfirmCancel(false);
            await load();
        } catch (err) {
            toast.error(err.message || 'Unable to cancel this order');
        } finally {
            setIsCancelling(false);
        }
    }

    const goBack = () => navigate('/user/orders');

    if (isLoading && !order) {
        return <div className="py-20 text-center text-sm text-zinc-400">Loading…</div>;
    }

    if (notFound || !order) {
        return (
            <div className="py-20 text-center">
                <Package className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
                <p className="mb-4 text-sm text-zinc-500">Order not found.</p>
                <button onClick={goBack} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50">
                    Back to orders
                </button>
            </div>
        );
    }

    const items = parseItems(order.items);
    const shipping = order.shipping ?? order.delivery_cost;
    const addressLine = [order.city, order.state, order.postal_code].filter(Boolean).join(', ');

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <button onClick={goBack} className="mb-2 flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900">
                        <ArrowLeft className="h-4 w-4" /> Back to orders
                    </button>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-mono text-xl font-semibold text-zinc-900">{order.order_number}</h1>
                        <StatusBadge status={order.status} pill />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                        Placed on {new Date(order.created_at).toLocaleString()}
                    </p>
                </div>
                {CANCELLABLE.includes(order.status) && (
                    <button
                        onClick={() => setConfirmCancel(true)}
                        className="h-9 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-medium text-red-700 hover:bg-red-100"
                    >
                        Cancel order
                    </button>
                )}
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                {/* Left */}
                <div className="space-y-5">
                    <Card title="Order progress">
                        <Tracker status={order.status} />
                        {order.tracking_number && (
                            <p className="mt-4 text-sm text-zinc-600">
                                Tracking number: <span className="font-mono font-medium text-zinc-900">{order.tracking_number}</span>
                            </p>
                        )}
                    </Card>

                    <Card title={`Items (${order.items_count ?? items.length})`}>
                        {items.length === 0 ? (
                            <p className="py-4 text-sm text-zinc-400">No items found.</p>
                        ) : (
                            <ul className="divide-y divide-zinc-100">
                                {items.map((item, i) => {
                                    const qty = Number(item.quantity || 1);
                                    const price = Number(item.priceValue || 0);
                                    const variant = [item.selectedColor, item.selectedSize].filter(Boolean).join(' · ');
                                    return (
                                        <li key={item.lineId ?? i} className="flex items-center gap-4 py-3">
                                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                                                {item.image && <img src={item.image} alt={item.name} className="h-full w-full object-cover" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-zinc-900">{item.name}</p>
                                                {variant && <p className="text-xs text-zinc-500">{variant}</p>}
                                                <p className="text-xs text-zinc-500">{qty} × {money(price)}</p>
                                            </div>
                                            <p className="text-sm font-medium text-zinc-900">{money(qty * price)}</p>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Card>
                </div>

                {/* Right */}
                <div className="space-y-5">
                    <Card title="Summary">
                        <Row label="Subtotal" value={money(order.subtotal)} />
                        <Row label="Shipping" value={money(shipping)} />
                        <Row label="Tax" value={money(order.state_tax)} />
                        {Number(order.processing_fee) > 0 && <Row label="Processing fee" value={money(order.processing_fee)} />}
                        <div className="my-2 border-t border-zinc-100" />
                        <Row label="Total" value={money(order.total)} bold />
                    </Card>

                    <Card title="Shipping address">
                        <address className="text-sm not-italic leading-6 text-zinc-700">
                            <p className="font-medium text-zinc-900">{order.first_name} {order.last_name}</p>
                            <p>{order.address_line_1}</p>
                            {order.address_line_2 && <p>{order.address_line_2}</p>}
                            {addressLine && <p>{addressLine}</p>}
                            {order.country && <p>{order.country}</p>}
                        </address>
                    </Card>

                    <Card title="Contact & payment">
                        <Row label="Email" value={order.email} />
                        {order.phone && <Row label="Phone" value={order.phone} />}
                        <Row label="Payment" value={<span className="capitalize">{order.payment_status || '—'}</span>} />
                    </Card>

                    {order.notes && (
                        <Card title="Order notes">
                            <p className="whitespace-pre-line text-sm text-zinc-700">{order.notes}</p>
                        </Card>
                    )}
                </div>
            </div>

            <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                        <AlertDialogDescription>This will cancel order {order.order_number}. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep order</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            disabled={isCancelling}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Cancel order
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}