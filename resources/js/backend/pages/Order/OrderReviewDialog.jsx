import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

import {
    AlertDialog, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

import { submitCustomerOrderReview } from './api';

const MAX_COMMENT = 1000;
const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
const primaryClass = 'bg-gradient-to-r from-[#2f4d73] to-[#1b2e4b] text-white';
const PROMPT_KEY = (id) => `viveren:review-prompted:${id}`;

export const canReview = (order) => order?.status === 'delivered' && !order?.is_reviewed;

function parseItems(items) {
    if (Array.isArray(items)) return items;
    if (typeof items === 'string') {
        try { return JSON.parse(items) || []; } catch { return []; }
    }
    return [];
}

function wasPrompted(id) {
    try { return localStorage.getItem(PROMPT_KEY(id)) === '1'; } catch { return false; }
}

function markPrompted(id) {
    try { localStorage.setItem(PROMPT_KEY(id), '1'); } catch { /* storage unavailable */ }
}

/**
 * Opens the review dialog by itself the first time a delivered, unreviewed order shows up.
 * Each order is offered once per browser; the Review button stays available afterwards.
 */
export function useReviewPrompt(orders, open) {
    useEffect(() => {
        const next = orders.find((o) => canReview(o) && !wasPrompted(o.id));
        if (!next) return;
        markPrompted(next.id);
        open(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders]);
}

function StarRating({ value, onChange, label }) {
    const [hover, setHover] = useState(0);
    const shown = hover || value;

    return (
        <div className="flex items-center gap-2">
            <div className="flex" role="radiogroup" aria-label={`Rating for ${label}`} onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={value === n}
                        aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                        onClick={() => onChange(value === n ? 0 : n)}
                        onMouseEnter={() => setHover(n)}
                        className="p-0.5"
                    >
                        <Star
                            className={`h-6 w-6 transition-colors ${
                                n <= shown ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-zinc-300'
                            }`}
                        />
                    </button>
                ))}
            </div>
            <span className="text-xs text-zinc-500">{RATING_LABELS[shown]}</span>
        </div>
    );
}

/** Mounted per order by the parent, so every open starts with a blank form */
export default function OrderReviewDialog({ order, onClose, onSubmitted }) {
    const items = parseItems(order.items);
    // { [itemIndex]: { rating, comment } }
    const [ratings, setRatings] = useState({});
    const [isBusy, setBusy] = useState(false);

    const rated = Object.entries(ratings).filter(([, r]) => r.rating > 0);
    const canSubmit = !isBusy && rated.length > 0;

    function update(index, patch) {
        setRatings((prev) => ({ ...prev, [index]: { rating: 0, comment: '', ...prev[index], ...patch } }));
    }

    async function submit() {
        setBusy(true);
        try {
            await submitCustomerOrderReview(order.id, rated.map(([index, r]) => ({
                item_index: Number(index),
                rating: r.rating,
                comment: r.comment.trim() || null,
            })));
            toast.success('Thanks for your review!');
            onSubmitted();
            onClose();
        } catch (e) {
            toast.error(e.message || 'Unable to submit your review');
        } finally {
            setBusy(false);
        }
    }

    return (
        <AlertDialog open onOpenChange={(open) => !open && !isBusy && onClose()}>
            <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
                <AlertDialogHeader>
                    <AlertDialogTitle>Your order has been delivered</AlertDialogTitle>
                    <AlertDialogDescription>
                        Order #{order.order_number}. How did you like your items? Rate the ones you'd like to review.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {items.length === 0 ? (
                    <p className="py-4 text-sm text-zinc-500">There are no items on this order to review.</p>
                ) : (
                    <ul className="divide-y divide-zinc-100">
                        {items.map((item, index) => {
                            const entry = ratings[index] ?? { rating: 0, comment: '' };
                            const variant = [item.selectedColor, item.selectedSize].filter(Boolean).join(' · ');
                            return (
                                <li key={item.lineId ?? index} className="py-3">
                                    <div className="flex items-start gap-3">
                                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                                            {item.image && <img src={item.image} alt={item.name} className="h-full w-full object-cover" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-zinc-900">{item.name}</p>
                                            {variant && <p className="text-xs text-zinc-500">{variant}</p>}
                                            <div className="mt-1">
                                                <StarRating
                                                    value={entry.rating}
                                                    label={item.name}
                                                    onChange={(rating) => update(index, { rating })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    {entry.rating > 0 && (
                                        <textarea
                                            value={entry.comment}
                                            onChange={(e) => update(index, { comment: e.target.value })}
                                            maxLength={MAX_COMMENT}
                                            rows={2}
                                            placeholder="Tell us about fit, fabric and quality (optional)"
                                            className="mt-2 w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-600"
                                        />
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isBusy}>Maybe later</AlertDialogCancel>
                    <Button onClick={submit} disabled={!canSubmit} className={primaryClass}>
                        {isBusy ? 'Submitting…' : 'Submit Review'}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
