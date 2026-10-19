import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Droplets, Leaf, Recycle, Star } from 'lucide-react';

import { useAppContext } from '@/context/AppContext';
import { requestJson } from '@/lib/apiClient';
import { bootstrapPublicSettings } from '../../utils/siteSettings';
import { fetchCustomerOrders } from './Order/api';

const STEP_LABELS = ['Ordered', 'Processing', 'Shipped', 'Delivered'];
const STEP_INDEX = { pending: 0, approved: 0, processing: 1, shipped: 2, delivered: 3 };
const STATUS_MESSAGE = {
    pending: 'Order received',
    approved: 'Order confirmed',
    processing: 'Being prepared',
    shipped: 'Shipped: On its way!',
    delivered: 'Delivered',
    cancelled: 'Order cancelled',
    refunded: 'Order refunded',
};
const INACTIVE = ['delivered', 'cancelled', 'refunded'];

const HIGHLIGHTS = [
    { icon: Leaf, text: 'Responsibly sourced natural fibres' },
    { icon: Recycle, text: 'Recycled and low-waste packaging' },
    { icon: Droplets, text: 'Water-saving production methods' },
];

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function assetUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    const v = value.trim();
    return /^(https?:)?\//.test(v) ? v : `/${v}`;
}

function firstItemImage(order) {
    let items = order?.items;
    if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = []; }
    }
    return assetUrl(Array.isArray(items) ? items[0]?.image : '');
}

function firstGalleryImage(gallery) {
    if (typeof gallery === 'string') {
        try { gallery = JSON.parse(gallery); } catch { return ''; }
    }

    if (!Array.isArray(gallery)) return '';
    const image = gallery.find(Boolean);
    return typeof image === 'string' ? image : image?.url ?? image?.path ?? '';
}

function mapProduct(p) {
    const image = p.cover_image
        || firstGalleryImage(p.image_gallery)
        || p.image_url
        || p.image
        || p.thumbnail
        || p.main_image
        || p.images?.[0]?.url
        || p.images?.[0]
        || '';
    return {
        id: p.id ?? p.slug,
        name: p.name ?? p.title ?? 'Product',
        slug: p.slug ?? p.id,
        image: assetUrl(typeof image === 'string' ? image : ''),
        rating: Number(p.rating ?? p.average_rating ?? 0),
    };
}

const cardCls = 'rounded-xl border border-[#dccfae] bg-white p-4 shadow-sm';

function Stars({ value }) {
    if (!value) return null;
    return (
        <div className="mt-1 flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`h-3 w-3 ${n <= Math.round(value) ? 'fill-[#b89b5e] text-[#b89b5e]' : 'text-zinc-300'}`} />
            ))}
        </div>
    );
}

function OrderRow({ order, onOpen }) {
    const image = firstItemImage(order);
    const stopped = order.status === 'cancelled' || order.status === 'refunded';
    const idx = STEP_INDEX[order.status] ?? 0;
    const pct = stopped ? 0 : (idx / (STEP_LABELS.length - 1)) * 100;

    return (
        <button onClick={() => onOpen(order.id)} className="flex w-full items-center gap-3 text-left">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                {image && <img src={image} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900">{STATUS_MESSAGE[order.status] ?? order.status}</p>
                <div className="relative mt-2 h-1 rounded bg-zinc-200">
                    <div
                        className={`absolute left-0 top-0 h-1 rounded ${stopped ? 'bg-red-300' : 'bg-zinc-900'}`}
                        style={{ width: stopped ? '100%' : `${pct}%` }}
                    />
                    {!stopped && (
                        <span
                            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#b89b5e] bg-white"
                            style={{ left: `${pct}%` }}
                        />
                    )}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
                    {STEP_LABELS.map((l) => <span key={l}>{l}</span>)}
                </div>
            </div>
        </button>
    );
}

export default function CustomerDashboard() {
    const navigate = useNavigate();
    const { setPageTitle, user } = useAppContext();

    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [products, setProducts] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [slide, setSlide] = useState(0);

    const userId = user?.id;

    useEffect(() => { setPageTitle('Dashboard'); }, [setPageTitle]);
    useEffect(() => { bootstrapPublicSettings(); }, []);

    useEffect(() => {
        if (!userId) return;
        let ignore = false;

        fetchCustomerOrders({ page: 1, perPage: 100 })
            .then((d) => {
                if (ignore) return;
                setOrders(d.data ?? []);
                setTotal(d.meta?.total ?? d.total ?? (d.data ?? []).length);
            })
            .catch(() => {})
            .finally(() => !ignore && setOrdersLoading(false));

        requestJson('/api/public/new-arrivals')
            .then((p) => {
                if (ignore) return;
                const list = Array.isArray(p) ? p : p?.data ?? p?.products ?? [];
                setProducts(list.slice(0, 3).map(mapProduct));
            })
            .catch(() => {});

        return () => { ignore = true; };
    }, [userId]);

    if (!user) return <div className="text-sm text-zinc-500">Loading dashboard...</div>;
    if (user.user_type !== 'customer') return <Navigate to="/admin/dashboard" replace />;

    const name = user.first_name || user.name;
    const recent = orders.slice(0, 2);
    const activeCount = orders.filter((o) => !INACTIVE.includes(o.status)).length;
    const totalSpent = orders
        .filter((o) => !['cancelled', 'refunded'].includes(o.status))
        .reduce((s, o) => s + Number(o.total || 0), 0);

    const Highlight = HIGHLIGHTS[slide];

    return (
        <div className="space-y-5">
            {/* Hero */}
            <section className="rounded-xl bg-gradient-to-r from-[#f6efe0] via-[#e8d6a8] to-[#cdae6a] px-6 py-8 sm:px-8">
                <h1 className="font-serif text-3xl text-zinc-900 sm:text-4xl">Welcome back, {name}</h1>
                <p className="mt-1 text-sm text-zinc-800">Let&apos;s explore your VIVEREN curated experience.</p>
            </section>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)]">
                {/* Recent Orders */}
                <section className={`${cardCls} flex flex-col`}>
                    <div className="mb-4 flex items-baseline justify-between gap-2">
                        <h2 className="font-serif text-lg text-zinc-900">Recent Orders</h2>
                        <span className="truncate text-xs text-zinc-600">{greeting()}, {name}</span>
                    </div>
                    <div className="flex-1 space-y-5">
                        {ordersLoading ? (
                            <p className="py-6 text-center text-sm text-zinc-400">Loading…</p>
                        ) : recent.length === 0 ? (
                            <p className="py-6 text-center text-sm text-zinc-400">You have no orders yet.</p>
                        ) : (
                            recent.map((o) => (
                                <OrderRow key={o.id} order={o} onOpen={(id) => navigate(`/user/orders/${id}`)} />
                            ))
                        )}
                    </div>
                    <div className="mt-5 flex justify-end">
                        <Link to="/user/orders" className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-black">
                            View All Orders
                        </Link>
                    </div>
                </section>

                {/* Product Recommendations */}
                <section className={`${cardCls} flex flex-col`}>
                    <h2 className="mb-4 font-serif text-lg text-zinc-900">Product Recommendations</h2>
                    {products.length === 0 ? (
                        <p className="flex-1 py-6 text-center text-sm text-zinc-400">No recommendations right now.</p>
                    ) : (
                        <div className="grid flex-1 grid-cols-3 gap-3">
                            {products.map((p) => (
                                <a key={p.id} href={`/product-details/${p.slug}`} className="text-center">
                                    <div className="aspect-[3/4] overflow-hidden rounded-lg bg-stone-100">
                                        {p.image && <img src={p.image} alt={p.name} className="h-full w-full object-cover" />}
                                    </div>
                                    <p className="mt-2 truncate text-xs font-medium text-zinc-900">{p.name}</p>
                                    <Stars value={p.rating} />
                                </a>
                            ))}
                        </div>
                    )}
                    <div className="mt-4 flex justify-center">
                        <a href="/shop" className="rounded-md bg-zinc-900 px-5 py-2 text-xs font-medium text-white hover:bg-black">
                            View Item
                        </a>
                    </div>
                </section>

                {/* Right column */}
                <div className="space-y-5">
                    <section className={cardCls}>
                        <h2 className="mb-3 font-serif text-lg text-zinc-900">Account Status</h2>
                        <div className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-200 p-3 text-center">
                            <div>
                                <p className="text-[11px] text-zinc-500">Orders</p>
                                <p className="text-lg font-semibold text-zinc-900">{total}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-zinc-500">Total Spent</p>
                                <p className="text-lg font-semibold text-zinc-900">{money(totalSpent)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-zinc-500">Active</p>
                                <p className="text-lg font-semibold text-zinc-900">{activeCount}</p>
                            </div>
                        </div>
                    </section>

                   
                </div>
            </div>
        </div>
    );
}