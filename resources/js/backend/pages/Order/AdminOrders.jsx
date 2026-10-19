import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppContext } from '@/context/AppContext';

import { bulkDeleteOrders, bulkUpdateOrders, fetchOrders } from './api';
import { STATUS_OPTIONS, StatusBadge, OrdersFilters, Pagination, useOrdersList, cap } from './shared';

function ShipStationSyncBadge({ order }) {
    if (order.shipstation_synced_at) {
        return (
            <div className="flex flex-col gap-0.5">
                <span className="inline-flex w-fit items-center rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Synced
                </span>
                {order.shipstation_order_id ? (
                    <span className="font-mono text-[11px] text-zinc-500">{order.shipstation_order_id}</span>
                ) : null}
            </div>
        );
    }
    if (['processing', 'shipped', 'delivered'].includes(order.status)) {
        return (
            <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Not synced
            </span>
        );
    }
    return <span className="text-xs text-zinc-400">-</span>;
}

export default function AdminOrders() {
    const navigate = useNavigate();
    const { setPageTitle, user } = useAppContext();
    const list = useOrdersList(fetchOrders, user);

    const [selected, setSelected] = useState(new Set());
    const [bulkStatus, setBulkStatus] = useState('');
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => { setPageTitle('Orders'); }, [setPageTitle]);

    const { orders } = list;
    const allSelected = orders.length > 0 && selected.size === orders.length;
    const someSelected = selected.size > 0;

    const toggleAll = (checked) => setSelected(checked ? new Set(orders.map((o) => o.id)) : new Set());
    const toggleOne = (id) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    async function runBulk(action, successMsg, failMsg, after) {
        setIsBulkUpdating(true);
        try {
            await action();
            toast.success(successMsg);
            after?.();
            setSelected(new Set());
            list.reload();
        } catch (err) {
            toast.error(err.message || failMsg);
        } finally {
            setIsBulkUpdating(false);
        }
    }

    const handleBulkStatusUpdate = () => {
        if (!bulkStatus || !selected.size) return;
        runBulk(() => bulkUpdateOrders([...selected], bulkStatus), 'Orders updated', 'Failed to update orders', () => setBulkStatus(''));
    };
    const handleBulkCancel = () => {
        if (!selected.size) return;
        runBulk(() => bulkUpdateOrders([...selected], 'cancelled'), 'Orders cancelled', 'Failed to cancel orders');
    };
    const handleBulkDelete = () =>
        runBulk(() => bulkDeleteOrders([...selected]), 'Orders deleted', 'Failed to delete orders', () => setConfirmDelete(false));

    return (
        <div className="px-4 py-6 sm:px-6">
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-zinc-900">Orders</h1>
                <p className="mt-0.5 text-sm text-zinc-500">{list.meta?.total ?? 0} total orders</p>
            </div>

            <OrdersFilters {...list} />

            {someSelected && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-4 py-2.5">
                    <span className="text-sm font-medium text-zinc-700">{selected.size} selected</span>
                    <select
                        value={bulkStatus}
                        onChange={(e) => setBulkStatus(e.target.value)}
                        className="h-8 rounded border border-zinc-300 bg-white px-2 text-sm text-zinc-800 outline-none"
                    >
                        <option value="">Set status…</option>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
                    </select>
                    <button
                        onClick={handleBulkStatusUpdate}
                        disabled={!bulkStatus || isBulkUpdating}
                        className="h-8 rounded bg-zinc-800 px-3 text-xs font-medium text-white hover:bg-zinc-900 disabled:opacity-50"
                    >
                        Apply Status
                    </button>
                    <button
                        onClick={handleBulkCancel}
                        disabled={isBulkUpdating}
                        className="h-8 rounded border border-orange-300 bg-orange-50 px-3 text-xs font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                    >
                        Cancel Orders
                    </button>
                    <button
                        onClick={() => setConfirmDelete(true)}
                        disabled={isBulkUpdating}
                        className="h-8 rounded border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                        Delete Selected
                    </button>
                </div>
            )}

            <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-zinc-50">
                        <tr>
                            <th className="w-10 px-3 py-3">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={(e) => toggleAll(e.target.checked)}
                                    className="h-4 w-4 rounded border-zinc-400 accent-zinc-800"
                                />
                            </th>
                            <th className="px-4 py-3 text-left font-semibold text-zinc-700">Order #</th>
                            <th className="px-4 py-3 text-left font-semibold text-zinc-700">Customer</th>
                            <th className="px-4 py-3 text-left font-semibold text-zinc-700">Email</th>
                            <th className="px-4 py-3 text-left font-semibold text-zinc-700">Items</th>
                            <th className="px-4 py-3 text-right font-semibold text-zinc-700">Total</th>
                            <th className="px-4 py-3 text-left font-semibold text-zinc-700">Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-zinc-700">ShipStation</th>
                            <th className="px-4 py-3 text-left font-semibold text-zinc-700">Date</th>
                            <th className="px-4 py-3 text-right font-semibold text-zinc-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {list.isLoading ? (
                            <tr><td colSpan={10} className="px-4 py-10 text-center text-zinc-400">Loading…</td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan={10} className="px-4 py-10 text-center text-zinc-400">No orders found</td></tr>
                        ) : orders.map((order) => (
                            <tr key={order.id} className="hover:bg-zinc-50">
                                <td className="px-3 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selected.has(order.id)}
                                        onChange={() => toggleOne(order.id)}
                                        className="h-4 w-4 rounded border-zinc-400 accent-zinc-800"
                                    />
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-zinc-700">{order.order_number}</td>
                                <td className="px-4 py-3 text-zinc-800">{order.first_name} {order.last_name}</td>
                                <td className="px-4 py-3 text-zinc-500">{order.email}</td>
                                <td className="px-4 py-3 text-center text-zinc-700">{order.items_count}</td>
                                <td className="px-4 py-3 text-right font-medium text-zinc-800">${Number(order.total).toFixed(2)}</td>
                                <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                                <td className="px-4 py-3"><ShipStationSyncBadge order={order} /></td>
                                <td className="px-4 py-3 text-xs text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => navigate(`/admin/orders/${order.id}/edit`)}
                                        className="rounded border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination {...list} />

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selected.size} order{selected.size !== 1 ? 's' : ''}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The selected orders will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} className="bg-red-600 text-white hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}