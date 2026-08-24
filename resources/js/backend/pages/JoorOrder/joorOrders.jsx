import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAppContext } from '@/context/AppContext';

import { fetchJoorOrders } from './api';

const STATUS_OPTIONS = ['', 'IN_PROGRESS', 'NOTES', 'PENDING', 'APPROVED', 'SHIPPED', 'CANCELLED'];

const STATUS_COLORS = {
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    NOTES: 'bg-zinc-100 text-zinc-700',
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    SHIPPED: 'bg-indigo-100 text-indigo-800',
    CANCELLED: 'bg-red-100 text-red-800',
};

function StatusBadge({ status }) {
    if (!status) return <span className="text-xs text-zinc-400">-</span>;
    const cls = STATUS_COLORS[status] || 'bg-zinc-100 text-zinc-700';
    return (
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
            {status}
        </span>
    );
}

export default function JoorOrders() {
    const navigate = useNavigate();
    const { setPageTitle } = useAppContext();

    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        setPageTitle('JOOR Orders');
    }, [setPageTitle]);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setLoadError('');

        fetchJoorOrders({ status, page, page_size: 20 })
            .then((data) => {
                if (cancelled) return;
                setOrders(Array.isArray(data?.orders) ? data.orders : []);
                if (!data?.ok && Array.isArray(data?.errors) && data.errors.length > 0) {
                    setLoadError(data.errors[0]?.message || 'JOOR returned an error.');
                }
            })
            .catch((err) => {
                if (cancelled) return;
                setLoadError(err.message || 'Failed to load orders from JOOR.');
                toast.error(err.message || 'Failed to load orders from JOOR.');
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => { cancelled = true; };
    }, [status, page]);

    function handleStatusChange(value) {
        setStatus(value);
        setPage(1);
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-zinc-900">JOOR Orders</h1>
                    <p className="text-sm text-zinc-500">Create, update, and review orders synced with your JOOR account.</p>
                </div>
                <Button onClick={() => navigate('/admin/joor-orders/add')}>Create Order</Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <select
                    value={status}
                    onChange={(event) => handleStatusChange(event.target.value)}
                    className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm"
                >
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.filter(Boolean).map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            </div>

            {loadError && <p className="text-sm text-destructive">{loadError}</p>}

            <div className="rounded-lg border border-zinc-200 bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>JOOR ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Tracking #</TableHead>
                            <TableHead>Date Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="py-8 text-center text-sm text-zinc-500">
                                    Loading orders…
                                </TableCell>
                            </TableRow>
                        ) : orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="py-8 text-center text-sm text-zinc-500">
                                    No orders found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                                    <TableCell>{order.customer?.name || order.customer?.code || order.customer?.id || '-'}</TableCell>
                                    <TableCell><StatusBadge status={order.status} /></TableCell>
                                    <TableCell>{order.total ?? '-'}</TableCell>
                                    <TableCell>{order.po_number || '-'}</TableCell>
                                    <TableCell>{order.tracking_number || '-'}</TableCell>
                                    <TableCell>{order.date_created ? new Date(order.date_created).toLocaleDateString() : '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigate(`/admin/joor-orders/${order.id}/edit`)}
                                        >
                                            Edit
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Previous
                </Button>
                <span className="text-sm text-zinc-500">Page {page}</span>
                <Button variant="outline" size="sm" disabled={orders.length < 20} onClick={() => setPage((p) => p + 1)}>
                    Next
                </Button>
            </div>
        </div>
    );
}
