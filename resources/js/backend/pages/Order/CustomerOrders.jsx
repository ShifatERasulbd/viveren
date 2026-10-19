import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Calendar, ChevronDown, Eye, Search, Trash2 } from 'lucide-react';

import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppContext } from '@/context/AppContext';

import { cancelCustomerOrder, fetchCustomerOrders, fetchCustomerRecentItems } from './api';
import { STATUS_DOT, STATUS_OPTIONS, StatusBadge, Pagination, useOrdersList, cap } from './shared';

const CANCELLABLE = ['pending', 'approved', 'processing'];
const money = (n) => `$${Number(n).toFixed(2)}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '');

function useOutsideClick(ref, onOutside) {
    useEffect(() => {
        const handler = (e) => ref.current && !ref.current.contains(e.target) && onOutside();
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [ref, onOutside]);
}

function DateRangeFilter({ range, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useOutsideClick(ref, () => setOpen(false));

    const label = range.from || range.to
        ? `${fmtDate(range.from) || '…'} – ${fmtDate(range.to) || '…'}`
        : 'All dates';

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 shadow-sm"
            >
                <Calendar className="h-4 w-4 text-zinc-500" />
                {label}
                <ChevronDown className="h-4 w-4 text-zinc-400" />
            </button>
            {open && (
                <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
                    <label className="mb-2 block text-xs text-zinc-500">
                        From
                        <input
                            type="date"
                            value={range.from}
                            max={range.to || undefined}
                            onChange={(e) => onChange({ ...range, from: e.target.value })}
                            className="mt-1 h-8 w-full rounded border border-zinc-300 px-2 text-sm text-zinc-800"
                        />
                    </label>
                    <label className="mb-3 block text-xs text-zinc-500">
                        To
                        <input
                            type="date"
                            value={range.to}
                            min={range.from || undefined}
                            onChange={(e) => onChange({ ...range, to: e.target.value })}
                            className="mt-1 h-8 w-full rounded border border-zinc-300 px-2 text-sm text-zinc-800"
                        />
                    </label>
                    <button
                        onClick={() => onChange({ from: '', to: '' })}
                        className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                    >
                        Clear
                    </button>
                </div>
            )}
        </div>
    );
}

function StatusFilter({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useOutsideClick(ref, () => setOpen(false));

    const pick = (v) => { onChange(v); setOpen(false); };

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex h-9 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-800 shadow-sm"
            >
                {value ? cap(value) : 'All Statuses'}
                <ChevronDown className="h-4 w-4 text-zinc-500" />
            </button>
            {open && (
                <ul className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg">
                    <li>
                        <button onClick={() => pick('')} className={`w-full px-3 py-1.5 text-left hover:bg-zinc-100 ${!value ? 'bg-zinc-100' : ''}`}>
                            All Statuses
                        </button>
                    </li>
                    {STATUS_OPTIONS.map((s) => (
                        <li key={s}>
                            <button onClick={() => pick(s)} className={`flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-100 ${value === s ? 'bg-zinc-100' : ''}`}>
                                <span className={`h-2.5 w-2.5 rounded-sm ${STATUS_DOT[s]}`} />
                                {cap(s)}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function RecentItems({ items, onDetails }) {
    return (
        <section className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-zinc-900">Recent Items</h2>
            {items.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-400">No recent items</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {items.slice(0, 2).map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                                {item.image_url && <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-zinc-900">{item.name}</p>
                                <p className="text-xs text-zinc-500">{item.quantity} {item.quantity === 1 ? 'item' : 'items'}</p>
                                <p className="text-sm font-medium text-zinc-800">{money(item.price)}</p>
                            </div>
                            <button
                                onClick={() => onDetails(item.order_id)}
                                className="shrink-0 rounded-md bg-gradient-to-r from-[#2f4d73] to-[#1b2e4b] px-2.5 py-1.5 text-xs font-medium text-white"
                            >
                                Order Details
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default function CustomerOrders() {
    const navigate = useNavigate();
    const { setPageTitle, user } = useAppContext();
    const list = useOrdersList(fetchCustomerOrders, user);
    const [recent, setRecent] = useState([]);
    const [cancelId, setCancelId] = useState(null);

    useEffect(() => { setPageTitle('My Orders'); }, [setPageTitle]);

    useEffect(() => {
        if (!user) return;
        fetchCustomerRecentItems().then((d) => setRecent(d.data ?? d ?? [])).catch(() => {});
    }, [user]);

    const openOrder = (id) => navigate(`/user/orders/${id}`);

    async function confirmCancel() {
        try {
            await cancelCustomerOrder(cancelId);
            toast.success('Order cancelled');
            list.reload();
        } catch (e) {
            toast.error(e.message || 'Unable to cancel this order');
        } finally {
            setCancelId(null);
        }
    }

    const { orders } = list;

    return (
        <div className="space-y-5">
            {/* Top row */}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <RecentItems items={recent} onDetails={openOrder} />

                <div>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-semibold text-zinc-900">Orders</h1>
                            <p className="mt-0.5 text-xs text-zinc-500">{list.meta?.total ?? 0} total orders</p>
                        </div>
                        <DateRangeFilter range={list.range} onChange={list.onRangeChange} />
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                        <div className="relative flex-1">
                            <input
                                type="search"
                                value={list.searchInput}
                                onChange={(e) => list.onSearchChange(e.target.value)}
                                placeholder="Search by order #, name or email…"
                                className="h-9 w-full rounded-lg border border-zinc-300 bg-white pl-3 pr-9 text-sm text-zinc-900 shadow-sm outline-none focus:border-zinc-600 [&::-webkit-search-cancel-button]:hidden"
                            />
                            <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-zinc-400" />
                        </div>
                        <StatusFilter value={list.filterStatus} onChange={list.onFilterStatus} />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="max-h-[480px] overflow-auto rounded-xl bg-white shadow-sm">
                <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-white">
                        <tr className="border-b border-zinc-200 text-zinc-800">
                            <th className="px-4 py-3 text-left font-semibold">Order #</th>
                            <th className="px-4 py-3 text-left font-semibold">Customer</th>
                            <th className="px-4 py-3 text-left font-semibold">Email</th>
                            <th className="px-4 py-3 text-right font-semibold">Items</th>
                            <th className="px-4 py-3 text-right font-semibold">Total</th>
                            <th className="px-4 py-3 text-left font-semibold">Status</th>
                            <th className="px-4 py-3 text-left font-semibold">Date</th>
                            <th className="px-4 py-3 text-right font-semibold">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {list.isLoading ? (
                            <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-400">Loading…</td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-400">No orders found</td></tr>
                        ) : orders.map((o) => (
                            <tr key={o.id} className="hover:bg-zinc-50">
                                <td className="px-4 py-3 font-mono text-xs text-zinc-700">{o.order_number}</td>
                                <td className="px-4 py-3 text-zinc-800">{o.first_name} {o.last_name}</td>
                                <td className="px-4 py-3 text-zinc-700">{o.email}</td>
                                <td className="px-4 py-3 text-right text-zinc-700">{o.items_count}</td>
                                <td className="px-4 py-3 text-right font-medium text-zinc-800">{money(o.total)}</td>
                                <td className="px-4 py-3"><StatusBadge status={o.status} pill /></td>
                                <td className="px-4 py-3 text-zinc-700">{fmtDate(o.created_at)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-3 text-zinc-500">
                                        <button title="View order" onClick={() => openOrder(o.id)} className="hover:text-zinc-900">
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                            title="Cancel order"
                                            disabled={!CANCELLABLE.includes(o.status)}
                                            onClick={() => setCancelId(o.id)}
                                            className="hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-zinc-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination {...list} />

            <AlertDialog open={cancelId !== null} onOpenChange={(o) => !o && setCancelId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                        <AlertDialogDescription>This will cancel the order. This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep order</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmCancel} className="bg-red-600 text-white hover:bg-red-700">
                            Cancel order
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}