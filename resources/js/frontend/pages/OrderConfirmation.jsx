import { CheckCircle2, Download, ReceiptText, ShoppingBag } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import RelatedProductsSection from '../components/RelatedProductsSection.jsx';
import { featuresFontClass } from '../utils/typography';
import { bootstrapPublicSettings, getSettingsPayload, onSettingsUpdated } from '../../utils/siteSettings';

function normalizeProductList(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    if (Array.isArray(payload?.items)) {
        return payload.items;
    }

    return [];
}

function formatMoney(value) {
    const next = Number(value);
    return Number.isFinite(next) ? next.toFixed(2) : '0.00';
}

function toImageUrl(path) {
    if (!path || typeof path !== 'string') {
        return '/uploads/heroes/images/hero1.webp';
    }

    if (path.startsWith('http')) {
        return path;
    }

    return `/${path.replace(/^\/+/, '')}`;
}

function readCachedInvoice(orderNumber) {
    try {
        const raw = sessionStorage.getItem('lastOrderInvoice') || localStorage.getItem('lastOrderInvoice');
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        const cachedOrderNumber = String(parsed.order_number || '').trim();
        if (orderNumber && cachedOrderNumber && cachedOrderNumber !== String(orderNumber).trim()) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

function buildInvoiceFileName(orderNumber) {
    const normalized = String(orderNumber || 'invoice')
        .trim()
        .replace(/[^a-z0-9_-]+/gi, '-')
        .replace(/-+/g, '-');

    return `${normalized || 'invoice'}.pdf`;
}

function resolveLogoUrl(value = '') {
    const path = String(value || '').trim();

    if (!path) {
        return '';
    }

    if (/^(https?:|data:|blob:)/i.test(path)) {
        return path;
    }

    return `/${path.replace(/^\/+/, '')}`;
}

function loadLogoImage(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                canvas.getContext('2d').drawImage(image, 0, 0);
                resolve({
                    data: canvas.toDataURL('image/png'),
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                });
            } catch {
                reject(new Error('The configured header logo could not be prepared for the invoice.'));
            }
        };
        image.onerror = () => reject(new Error('The configured header logo could not be loaded.'));
        image.src = source;
    });
}

export default function OrderConfirmationPage() {
    const [searchParams] = useSearchParams();
    const orderNumber = searchParams.get('order') || '';
    const cachedInvoice = useMemo(() => readCachedInvoice(orderNumber), [orderNumber]);
    const email = searchParams.get('email') || String(cachedInvoice?.email || '');
    const [order, setOrder] = useState(cachedInvoice || null);
    const [orderError, setOrderError] = useState('');
    const [isLoadingOrder, setIsLoadingOrder] = useState(false);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [siteSettings, setSiteSettings] = useState(() => getSettingsPayload());

    useEffect(() => {
        const unsubscribe = onSettingsUpdated((payload) => setSiteSettings(payload || {}));
        bootstrapPublicSettings().then((payload) => setSiteSettings(payload || {}));

        return unsubscribe;
    }, []);

    useEffect(() => {
        let ignore = false;

        async function loadOrder() {
            if (!orderNumber) {
                if (cachedInvoice) {
                    setOrder(cachedInvoice);
                    setOrderError('');
                    return;
                }

                setOrder(null);
                setOrderError('Order details are unavailable. Please use the confirmation link sent to your email.');
                return;
            }

            try {
                if (!ignore) {
                    setIsLoadingOrder(true);
                    setOrderError('');
                }

                const requestUrl = email
                    ? `/api/public/orders/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent(email)}`
                    : `/api/public/orders/${encodeURIComponent(orderNumber)}`;

                const response = await fetch(requestUrl, { headers: { Accept: 'application/json' } });

                const payload = await response.json().catch(() => ({}));

                if (!response.ok) {
                    if (!ignore) {
                        setOrder(null);
                        setOrderError(String(payload?.message || 'Unable to load order details.'));
                    }
                    return;
                }

                if (!ignore) {
                    setOrder(payload?.order || null);
                }
            } catch {
                if (!ignore) {
                    setOrder(null);
                    setOrderError('Unable to load order details right now.');
                }
            } finally {
                if (!ignore) {
                    setIsLoadingOrder(false);
                }
            }
        }

        loadOrder();

        return () => {
            ignore = true;
        };
    }, [orderNumber, email, cachedInvoice]);

    useEffect(() => {
        let ignore = false;

        async function loadRelatedProducts() {
            try {
                const response = await fetch('/api/public/shop-products', {
                    headers: { Accept: 'application/json' },
                });

                const payload = await response.json().catch(() => ({}));
                const products = response.ok ? normalizeProductList(payload) : [];
                const purchasedIds = new Set(
                    (Array.isArray(order?.items) ? order.items : [])
                        .map((item) => Number(item?.productId || item?.product_id))
                        .filter((id) => Number.isInteger(id) && id > 0),
                );

                const filtered = products.filter((item) => {
                    const id = Number(item?.id);
                    return !(Number.isInteger(id) && purchasedIds.has(id));
                });

                if (!ignore) {
                    setRelatedProducts(filtered.slice(0, 4));
                }
            } catch {
                if (!ignore) {
                    setRelatedProducts([]);
                }
            }
        }

        loadRelatedProducts();

        return () => {
            ignore = true;
        };
    }, [order?.items]);

    const invoiceItems = useMemo(
        () => (Array.isArray(order?.items) ? order.items : []),
        [order?.items],
    );

    const createdDate = useMemo(() => {
        if (!order?.created_at) {
            return '-';
        }

        const parsed = new Date(order.created_at);
        if (Number.isNaN(parsed.getTime())) {
            return '-';
        }

        return parsed.toLocaleString();
    }, [order?.created_at]);

    async function handleDownloadInvoice() {
        if (!order) {
            toast.error('Invoice details are not available yet.');
            return;
        }

        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 44;
        const contentWidth = pageWidth - (margin * 2);
        const navy = [31, 47, 67];
        const muted = [105, 112, 121];
        const gold = [174, 143, 91];
        const light = [245, 246, 247];
        const columns = {
            item: margin + 12,
            qty: pageWidth - margin - 166,
            price: pageWidth - margin - 104,
            total: pageWidth - margin - 12,
        };
        let cursorY = 0;
        let logoImage = null;
        const logoUrl = resolveLogoUrl(siteSettings?.header_logo);

        if (logoUrl) {
            try {
                logoImage = await loadLogoImage(logoUrl);
            } catch (error) {
                toast.warning(`${error.message} The invoice will be downloaded without it.`);
            }
        }

        const drawTableHeader = () => {
            doc.setFillColor(...navy);
            doc.roundedRect(margin, cursorY, contentWidth, 30, 4, 4, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text('ITEM', columns.item, cursorY + 19);
            doc.text('QTY', columns.qty, cursorY + 19, { align: 'center' });
            doc.text('PRICE', columns.price, cursorY + 19, { align: 'right' });
            doc.text('TOTAL', columns.total, cursorY + 19, { align: 'right' });
            cursorY += 42;
        };

        const addPageWithTableHeader = () => {
            doc.addPage();
            cursorY = 48;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...muted);
            doc.text(`ORDER ${String(order.order_number || '').toUpperCase()}`, margin, cursorY);
            cursorY += 20;
            drawTableHeader();
        };

        doc.setFillColor(...navy);
        doc.rect(0, 0, pageWidth, 8, 'F');

        if (logoImage) {
            const maxLogoWidth = 142;
            const maxLogoHeight = 48;
            const scale = Math.min(maxLogoWidth / logoImage.width, maxLogoHeight / logoImage.height);
            const logoWidth = logoImage.width * scale;
            const logoHeight = logoImage.height * scale;
            doc.addImage(logoImage.data, 'PNG', margin, 38 + ((maxLogoHeight - logoHeight) / 2), logoWidth, logoHeight);
        } else {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(21);
            doc.setTextColor(...navy);
            doc.text('VIVEREN', margin, 69);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(...navy);
        doc.text('INVOICE', pageWidth - margin, 54, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...muted);
        doc.text(`ORDER  ${order.order_number || '-'}`, pageWidth - margin, 72, { align: 'right' });
        doc.text(`ISSUED  ${createdDate}`, pageWidth - margin, 87, { align: 'right' });
        doc.setDrawColor(...gold);
        doc.setLineWidth(1.5);
        doc.line(margin, 104, pageWidth - margin, 104);

        cursorY = 124;
        doc.setFillColor(...light);
        doc.roundedRect(margin, cursorY, contentWidth, 62, 5, 5, 'F');
        const metaColumns = [margin + 14, margin + 184, margin + 354];
        const metadata = [
            ['ORDER STATUS', order.status || 'Processing'],
            ['COURIER', order.courier_service || '-'],
            ['TRACKING NUMBER', order.courier_reference || '-'],
        ];
        metadata.forEach(([label, value], index) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...muted);
            doc.text(label, metaColumns[index], cursorY + 22);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...navy);
            const wrapped = doc.splitTextToSize(String(value), 150);
            doc.text(wrapped.slice(0, 2), metaColumns[index], cursorY + 41);
        });

        cursorY += 89;
        const cardGap = 14;
        const cardWidth = (contentWidth - cardGap) / 2;
        const customerLines = [
            `${order.first_name || ''} ${order.last_name || ''}`.trim() || '-',
            order.email || '-',
            order.phone || '-',
        ];
        const addressLines = [
            order.address_line_1 || '-',
            order.address_line_2 || '',
            [order.city, order.state, order.postal_code].filter(Boolean).join(', ') || '-',
            order.country || '-',
        ].filter(Boolean);

        [
            { title: 'BILLED TO', lines: customerLines, x: margin },
            { title: 'SHIPPING ADDRESS', lines: addressLines, x: margin + cardWidth + cardGap },
        ].forEach(({ title, lines, x }) => {
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(224, 227, 230);
            doc.roundedRect(x, cursorY, cardWidth, 91, 5, 5, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...gold);
            doc.text(title, x + 13, cursorY + 19);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...navy);
            let lineY = cursorY + 39;
            lines.forEach((line) => {
                const wrapped = doc.splitTextToSize(String(line), cardWidth - 26);
                doc.text(wrapped, x + 13, lineY);
                lineY += wrapped.length * 12;
            });
        });

        cursorY += 116;
        drawTableHeader();

        invoiceItems.forEach((item, index) => {
            const qty = Number(item?.quantity || 1);
            const price = Number(item?.priceValue || 0);
            const lineTotal = Number.isFinite(price) && Number.isFinite(qty) ? price * qty : 0;
            const details = [
                item?.selectedColor ? `Color: ${item.selectedColor}` : '',
                item?.selectedSize ? `Size: ${item.selectedSize}` : '',
            ].filter(Boolean).join('  |  ');
            const itemWidth = columns.qty - columns.item - 22;
            const wrappedName = doc.splitTextToSize(String(item?.name || `Item ${index + 1}`), itemWidth);
            const wrappedDetails = details ? doc.splitTextToSize(details, itemWidth) : [];
            const rowHeight = Math.max(42, 16 + ((wrappedName.length + wrappedDetails.length) * 12));

            if (cursorY + rowHeight > pageHeight - 56) {
                addPageWithTableHeader();
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...navy);
            doc.text(wrappedName, columns.item, cursorY + 15);
            if (wrappedDetails.length > 0) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(...muted);
                doc.text(wrappedDetails, columns.item, cursorY + 15 + (wrappedName.length * 12));
            }
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...navy);
            doc.text(String(qty), columns.qty, cursorY + 15, { align: 'center' });
            doc.text(`$${formatMoney(price)}`, columns.price, cursorY + 15, { align: 'right' });
            doc.setFont('helvetica', 'bold');
            doc.text(`$${formatMoney(lineTotal)}`, columns.total, cursorY + 15, { align: 'right' });

            cursorY += rowHeight;
            doc.setDrawColor(231, 233, 235);
            doc.setLineWidth(0.6);
            doc.line(margin, cursorY, pageWidth - margin, cursorY);
        });

        cursorY += 20;
        if (cursorY + 110 > pageHeight - 48) {
            doc.addPage();
            cursorY = 56;
        }

        const totalsX = pageWidth - margin - 190;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...muted);
        doc.text('Subtotal', totalsX, cursorY);
        doc.setTextColor(...navy);
        doc.text(`$${formatMoney(order.subtotal)}`, pageWidth - margin, cursorY, { align: 'right' });
        cursorY += 19;
        doc.setTextColor(...muted);
        doc.text('Shipping', totalsX, cursorY);
        doc.setTextColor(...navy);
        doc.text(`$${formatMoney(order.shipping)}`, pageWidth - margin, cursorY, { align: 'right' });
        cursorY += 13;
        doc.setDrawColor(...gold);
        doc.setLineWidth(0.8);
        doc.line(totalsX, cursorY, pageWidth - margin, cursorY);
        cursorY += 22;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...navy);
        doc.text('TOTAL', totalsX, cursorY);
        doc.text(`$${formatMoney(order.total)}`, pageWidth - margin, cursorY, { align: 'right' });

        for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
            doc.setPage(page);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...muted);
            doc.text('Thank you for shopping with Viveren.', margin, pageHeight - 24);
            doc.text(`${page} / ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 24, { align: 'right' });
        }

        doc.save(buildInvoiceFileName(order.order_number));
    }

    return (
        <>
        <section className={`${featuresFontClass} font-monstrate bg-[#f7f7f5] px-5 py-12 sm:px-8 lg:px-12 lg:py-16`}>
            <div className="mx-auto w-full max-w-[1200px] space-y-8">
                <div className="rounded-[28px] border border-zinc-200 bg-white px-6 py-10 shadow-[0_20px_60px_rgba(0,0,0,0.06)] sm:px-10 lg:px-14">
                <div className="flex items-start gap-4">
                    <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="size-7" />
                    </div>

                    <div className="flex-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Order Confirmed</p>
                        <h1 className="font-monstrate mt-2 text-[2.2rem] font-semibold uppercase tracking-[0.03em] text-zinc-900 sm:text-[2.8rem]">
                            Thank you for your order
                        </h1>
                        <p className="font-monstrate mt-3 max-w-2xl text-[0.98rem] leading-7 text-zinc-600">
                            Your order has been placed successfully. We&apos;ll prepare it for processing and you&apos;ll receive updates shortly.
                        </p>

                        
                    </div>
                </div>

                {isLoadingOrder ? (
                    <div className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-6 text-sm text-zinc-600">
                        Loading full order invoice...
                    </div>
                ) : order ? (
                    <div className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-6 lg:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                            <h2 className="inline-flex items-center gap-2 text-[1.1rem] font-semibold uppercase tracking-[0.08em] text-zinc-900">
                                <ReceiptText className="size-5" />
                                Invoice
                            </h2>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleDownloadInvoice}
                                    className="font-monstrate inline-flex h-12 items-center justify-center gap-2 rounded border border-zinc-300 bg-white px-6 text-[0.85rem] font-semibold uppercase tracking-[0.14em] text-zinc-900 transition-colors hover:border-zinc-900 hover:bg-zinc-50"
                                >
                                    <Download className="size-4" />
                                    Download Invoice
                                </button>
                                <Link
                                    to="/shop"
                                    className="font-monstrate inline-flex h-12 items-center justify-center gap-2 rounded bg-zinc-900 px-6 text-[0.85rem] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-black"
                                >
                                    <ShoppingBag className="size-4" />
                                    Continue Shopping
                                </Link>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2 lg:grid-cols-4">
                            <p><span className="font-semibold text-zinc-900">Order:</span> {order.order_number || '-'}</p>
                            <p><span className="font-semibold text-zinc-900">Status:</span> {order.status || '-'}</p>
                            <p><span className="font-semibold text-zinc-900">Courier:</span> {order.courier_service || '-'}</p>
                            <p><span className="font-semibold text-zinc-900">Tracking:</span> {order.courier_reference || '-'}</p>
                        </div>

                        <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                            <div className="rounded border border-zinc-200 bg-white p-4">
                                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Customer</h3>
                                <p className="mt-2 font-medium text-zinc-900">{order.first_name} {order.last_name}</p>
                                <p className="text-zinc-700">{order.email}</p>
                                <p className="text-zinc-700">{order.phone || '-'}</p>
                            </div>
                            <div className="rounded border border-zinc-200 bg-white p-4">
                                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Shipping Address</h3>
                                <p className="mt-2 text-zinc-900">{order.address_line_1 || '-'}</p>
                                {order.address_line_2 ? <p className="text-zinc-900">{order.address_line_2}</p> : null}
                                <p className="text-zinc-900">{[order.city, order.state, order.postal_code].filter(Boolean).join(', ') || '-'}</p>
                                <p className="text-zinc-900">{order.country || '-'}</p>
                            </div>
                        </div>

                        <div className="mt-6 overflow-x-auto rounded border border-zinc-200 bg-white">
                            <table className="min-w-full text-left text-sm">
                                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-[0.12em] text-zinc-500">
                                    <tr>
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3">Qty</th>
                                        <th className="px-4 py-3">Price</th>
                                        <th className="px-4 py-3">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoiceItems.map((item, index) => {
                                        const qty = Number(item?.quantity || 1);
                                        const price = Number(item?.priceValue || 0);
                                        const lineTotal = Number.isFinite(price) && Number.isFinite(qty) ? price * qty : 0;

                                        return (
                                            <tr key={`${item?.lineId || item?.productId || 'line'}-${index}`} className="border-b border-zinc-100 last:border-b-0">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={toImageUrl(item?.image || '')}
                                                            alt={String(item?.name || 'Product')}
                                                            className="h-14 w-12 rounded object-cover"
                                                        />
                                                        <div>
                                                            <p className="font-monstrate font-medium uppercase tracking-[0.05em] text-zinc-900">{item?.name || 'Product'}</p>
                                                            <p className="text-xs text-zinc-500">
                                                                {[item?.selectedColor ? `Color: ${item.selectedColor}` : '', item?.selectedSize ? `Size: ${item.selectedSize}` : '']
                                                                    .filter(Boolean)
                                                                    .join(' | ') || '-'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-zinc-700">{qty}</td>
                                                <td className="px-4 py-3 text-zinc-700">${formatMoney(price)}</td>
                                                <td className="px-4 py-3 font-medium text-zinc-900">${formatMoney(lineTotal)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="ml-auto mt-6 w-full max-w-[320px] space-y-2 text-sm text-zinc-700">
                            <div className="flex items-center justify-between">
                                <span>Subtotal</span>
                                <span>${formatMoney(order.subtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Shipping</span>
                                <span>${formatMoney(order.shipping)}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-zinc-200 pt-2 text-[1rem] font-semibold text-zinc-900">
                                <span>Total</span>
                                <span>${formatMoney(order.total)}</span>
                            </div>
                        </div>
                    </div>
                ) : orderError ? (
                    <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-700">
                        {orderError}
                    </div>
                ) : null}
                </div>
            </div>
        </section>

        <RelatedProductsSection products={relatedProducts} />
        </>
    );
}
