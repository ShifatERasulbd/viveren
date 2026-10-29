import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export const STATUS_OPTIONS = ['pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

const STATUS_COLORS = {
    pending:    'bg-yellow-100 text-yellow-800',
    approved:   'bg-emerald-100 text-emerald-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped:    'bg-indigo-100 text-indigo-800',
    delivered:  'bg-green-100 text-green-800',
    cancelled:  'bg-red-100 text-red-800',
    refunded:   'bg-zinc-100 text-zinc-700',
};

export const STATUS_DOT = {
    pending:    'bg-yellow-400',
    approved:   'bg-emerald-500',
    processing: 'bg-amber-400',
    shipped:    'bg-green-600',
    delivered:  'bg-green-500',
    cancelled:  'bg-red-500',
    refunded:   'bg-zinc-400',
};

export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function StatusBadge({ status, pill = false }) {
    const cls = STATUS_COLORS[status] || 'bg-zinc-100 text-zinc-700';
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium capitalize ${pill ? 'rounded-full' : 'rounded'} ${cls}`}>
            {status}
        </span>
    );
}

/** Shared list state: paging, debounced search, status filter, date range, reload */
export function useOrdersList(fetcher, user) {
    const [orders, setOrders] = useState([]);
    const [meta, setMeta] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [range, setRange] = useState({ from: '', to: '' });
    const [tick, setTick] = useState(0);
    const timer = useRef(null);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        setIsLoading(true);

        fetcher({ page, perPage: 20, status: filterStatus, search, from: range.from, to: range.to })
            .then((data) => {
                if (cancelled) return;
                setOrders(data.data ?? []);
                // Laravel's paginator returns total/current_page/last_page at the top level, not under `meta`
                setMeta(data.meta ?? { total: data.total, current_page: data.current_page, last_page: data.last_page });
            })
            .catch((err) => !cancelled && toast.error(err.message || 'Failed to load orders'))
            .finally(() => !cancelled && setIsLoading(false));

        return () => { cancelled = true; };
    }, [fetcher, user, page, filterStatus, search, range, tick]);

    useEffect(() => () => clearTimeout(timer.current), []);

    const onSearchChange = (value) => {
        setSearchInput(value);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            setSearch(value.trim());
            setPage(1);
        }, 350);
    };

    const onFilterStatus = (value) => {
        setFilterStatus(value);
        setPage(1);
    };

    const onRangeChange = (r) => {
        setRange(r);
        setPage(1);
    };

    const reload = useCallback(() => setTick((t) => t + 1), []);

    return {
        orders, meta, isLoading, page, setPage,
        searchInput, onSearchChange,
        filterStatus, onFilterStatus,
        range, onRangeChange,
        reload,
        lastPage: meta?.last_page ?? 1,
    };
}

/** Used by AdminOrders */
export function OrdersFilters({ searchInput, onSearchChange, filterStatus, onFilterStatus }) {
    return (
        <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
                type="search"
                value={searchInput}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by order #, name or email…"
                className="h-9 w-64 rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-zinc-600"
            />
            <select
                value={filterStatus}
                onChange={(e) => onFilterStatus(e.target.value)}
                className="h-9 rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-600"
            >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
            </select>
        </div>
    );
}

export function Pagination({ meta, page, lastPage, setPage }) {
    if (lastPage <= 1) return null;
    return (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
            <span>Page {meta?.current_page ?? 1} of {lastPage}</span>
            <div className="flex gap-2">
                <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 rounded border border-zinc-300 bg-white px-3 text-xs hover:bg-zinc-50 disabled:opacity-40"
                >
                    Previous
                </button>
                <button
                    disabled={page >= lastPage}
                    onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                    className="h-8 rounded border border-zinc-300 bg-white px-3 text-xs hover:bg-zinc-50 disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    );
}