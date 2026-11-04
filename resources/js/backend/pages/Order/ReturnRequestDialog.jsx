import { useEffect, useState } from 'react';
import { CardNumberElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { toast } from 'sonner';

import CardPaymentFields, { cardElementsOptions } from '../../../frontend/components/CardPaymentFields';

import {
    AlertDialog, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { getStripe } from '@/lib/stripe';

import { confirmCustomerReturn, fetchCustomerReturnOptions, requestCustomerReturn } from './api';
import { RETURN_REASONS } from './shared';

// Matches RETURN_VIDEO_MAX_KB on the server
const MAX_VIDEO_MB = 100;
// Matches ReturnFeeService::AMOUNT_CENTS on the server; the charged amount always comes from the server
const RETURN_FEE = 7;
const money = (n) => `$${Number(n).toFixed(2)}`;
const fieldClass = 'h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-normal text-zinc-900 outline-none focus:border-zinc-600';
const primaryClass = 'bg-gradient-to-r from-[#2f4d73] to-[#1b2e4b] text-white';

function ChoiceButton({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`h-9 rounded-md border px-4 text-sm font-medium ${
                active ? 'border-amber-600 bg-amber-600 text-white' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
        >
            {children}
        </button>
    );
}

function ReplacementSizes({ items, isLoading, sizes, onChange }) {
    if (isLoading) return <p className="text-sm text-zinc-500">Loading sizes…</p>;

    return (
        <div className="space-y-3">
            {items.map((item) => {
                const options = item.sizes.filter((s) => s.toLowerCase() !== item.size.toLowerCase());
                return (
                    <div key={item.index} className="rounded-lg border border-zinc-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-zinc-900">
                                {item.name}
                                {item.color && <span className="font-normal text-zinc-500"> · {item.color}</span>}
                            </p>
                            <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                                Ordered Size: <strong className="text-zinc-900">{item.size || '—'}</strong>
                            </span>
                        </div>
                        {options.length > 0 ? (
                            <label className="mt-2 block text-xs text-zinc-500">
                                Replacement Size:
                                <select
                                    value={sizes[item.index] ?? ''}
                                    onChange={(e) => onChange(item.index, e.target.value)}
                                    className={`mt-1 ${fieldClass}`}
                                >
                                    <option value="">Keep current size</option>
                                    {options.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </label>
                        ) : (
                            <p className="mt-2 text-xs text-zinc-500">No other sizes are in stock for this item right now.</p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/** Second step: charge the return fee with the same card form as checkout, then tell the server it's paid */
function ReturnFeePayment({ order, payment, isBusy, setBusy, onBack, onDone }) {
    const stripe = useStripe();
    const elements = useElements();
    // Set once the card is charged, so a failed confirm can be retried without paying again
    const [paidIntentId, setPaidIntentId] = useState(null);
    const [brand, setBrand] = useState('unknown');
    const [cardStatus, setCardStatus] = useState({
        number: { complete: false, error: '' },
        expiry: { complete: false, error: '' },
        cvc: { complete: false, error: '' },
    });
    const [touched, setTouched] = useState({});
    const [nameOnCard, setNameOnCard] = useState('');
    const [showErrors, setShowErrors] = useState(false);

    const fieldError = (field, emptyMessage) => cardStatus[field].error
        || ((showErrors || touched[field]) && !cardStatus[field].complete ? emptyMessage : '');
    const errors = {
        number: fieldError('number', 'Enter a card number'),
        expiry: fieldError('expiry', 'Enter a valid expiration date'),
        cvc: fieldError('cvc', 'Enter the security code or CVV'),
        nameOnCard: (showErrors || touched.nameOnCard) && !nameOnCard.trim() ? 'Enter the name on your card' : '',
    };
    const isCardComplete = Object.values(cardStatus).every((s) => s.complete) && nameOnCard.trim() !== '';

    const onFieldChange = (field) => (event) => {
        if (field === 'number') setBrand(event?.empty ? 'unknown' : event?.brand || 'unknown');
        setCardStatus((prev) => ({ ...prev, [field]: { complete: Boolean(event?.complete), error: event?.error?.message || '' } }));
    };
    const onFieldBlur = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }));

    async function pay() {
        if (!paidIntentId && !isCardComplete) {
            setShowErrors(true);
            return;
        }

        setBusy(true);
        try {
            let intentId = paidIntentId;
            if (!intentId) {
                const result = await stripe.confirmCardPayment(payment.clientSecret, {
                    payment_method: {
                        card: elements.getElement(CardNumberElement),
                        billing_details: {
                            name: nameOnCard.trim(),
                            email: order.email || undefined,
                        },
                    },
                });
                if (result.error) {
                    toast.error(result.error.message || 'Payment failed. Please check your card details.');
                    return;
                }
                if (result.paymentIntent?.status !== 'succeeded') {
                    toast.error('Payment was not completed. Please try again.');
                    return;
                }
                intentId = result.paymentIntent.id;
                setPaidIntentId(intentId);
            }

            await confirmCustomerReturn(order.id, intentId);
            toast.success('Return request submitted');
            onDone();
        } catch (e) {
            toast.error(e.message || 'Unable to submit your return. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3 text-sm">
                <span className="text-zinc-600">Return fee</span>
                <span className="font-semibold text-zinc-900">{money(payment.amount)}</span>
            </div>

            {paidIntentId ? (
                <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                    Payment received. Click below to finish submitting your return. You won't be charged again.
                </p>
            ) : (
                <div>
                    <p className="mb-3 text-[0.85rem] text-zinc-500">All transactions are secure and encrypted.</p>
                    <CardPaymentFields
                        brand={brand}
                        errors={errors}
                        nameOnCard={nameOnCard}
                        onNameOnCardChange={setNameOnCard}
                        onNameOnCardBlur={() => setTouched((prev) => ({ ...prev, nameOnCard: true }))}
                        onFieldChange={onFieldChange}
                        onFieldBlur={onFieldBlur}
                    />
                </div>
            )}

            <AlertDialogFooter>
                <Button variant="outline" onClick={onBack} disabled={isBusy || paidIntentId !== null}>Back</Button>
                <Button onClick={pay} disabled={isBusy || !stripe || !elements} className={primaryClass}>
                    {isBusy
                        ? 'Processing…'
                        : !stripe || !elements
                            ? 'Loading Secure Payment…'
                            : paidIntentId ? 'Finish Submitting Return' : `Pay ${money(payment.amount)} & Submit`}
                </Button>
            </AlertDialogFooter>
        </>
    );
}

/** Mounted per order by the parent, so every open starts with a blank form */
export default function ReturnRequestDialog({ order, onClose, onSubmitted }) {
    const [reason, setReason] = useState('');
    const [replaceSize, setReplaceSize] = useState(null);
    const [items, setItems] = useState(null);
    const [sizes, setSizes] = useState({});
    const [video, setVideo] = useState(null);
    const [comments, setComments] = useState('');
    const [isBusy, setBusy] = useState(false);
    // { clientSecret, amount } once the details are saved and the fee is due
    const [payment, setPayment] = useState(null);
    // Start loading Stripe.js as soon as the dialog opens
    const [stripePromise] = useState(getStripe);
    const [elementsOptions] = useState(cardElementsOptions);

    // Load the size options the first time the customer asks for a replacement
    useEffect(() => {
        if (!replaceSize || items) return undefined;
        let ignore = false;
        fetchCustomerReturnOptions(order.id)
            .then((d) => !ignore && setItems(d.items ?? []))
            .catch(() => {
                if (ignore) return;
                setItems([]);
                toast.error('Unable to load sizes for this order');
            });
        return () => { ignore = true; };
    }, [order.id, replaceSize, items]);

    const wantsSwap = reason === 'size_issue' && replaceSize === true;
    const chosenSwaps = Object.entries(sizes).filter(([, size]) => size);
    const canSubmit = !isBusy
        && reason !== ''
        && (reason !== 'size_issue' || replaceSize !== null)
        && (!wantsSwap || chosenSwaps.length > 0)
        && (reason !== 'damaged_product' || video !== null);

    function pickVideo(e) {
        const file = e.target.files?.[0] ?? null;
        if (file && file.size > MAX_VIDEO_MB * 1024 * 1024) {
            toast.error(`The video must be ${MAX_VIDEO_MB} MB or smaller`);
            e.target.value = '';
            setVideo(null);
            return;
        }
        setVideo(file);
    }

    function finish() {
        onSubmitted();
        onClose();
    }

    async function submit() {
        const form = new FormData();
        form.append('reason', reason);
        if (comments.trim()) form.append('comments', comments.trim());
        if (reason === 'size_issue') form.append('replace_size', replaceSize ? '1' : '0');
        if (wantsSwap) {
            chosenSwaps.forEach(([index, size], i) => {
                form.append(`replacements[${i}][item_index]`, index);
                form.append(`replacements[${i}][size]`, size);
            });
        }
        if (reason === 'damaged_product') form.append('video', video);

        setBusy(true);
        try {
            const res = await requestCustomerReturn(order.id, form);
            // An earlier attempt was already paid for, so the return went straight through
            if (res.payment?.paid) {
                toast.success('Return request submitted');
                finish();
                return;
            }
            setPayment({ clientSecret: res.payment.client_secret, amount: res.payment.amount });
        } catch (e) {
            toast.error(e.message || 'Unable to submit this return');
        } finally {
            setBusy(false);
        }
    }

    return (
        <AlertDialog open onOpenChange={(open) => !open && !isBusy && onClose()}>
            <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
                <AlertDialogHeader>
                    <AlertDialogTitle>{payment ? 'Pay Return Fee' : 'Initiate Return'}</AlertDialogTitle>
                    <AlertDialogDescription>Order #{order.order_number}</AlertDialogDescription>
                </AlertDialogHeader>

                {payment && (
                    <Elements stripe={stripePromise} options={elementsOptions}>
                        <ReturnFeePayment
                            order={order}
                            payment={payment}
                            isBusy={isBusy}
                            setBusy={setBusy}
                            onBack={() => setPayment(null)}
                            onDone={finish}
                        />
                    </Elements>
                )}

                {/* Hidden rather than unmounted while paying, so Back keeps the chosen video file */}
                <div className={payment ? 'hidden' : 'grid gap-4'}>
                    <label className="block text-sm font-medium text-zinc-800">
                        Return Reason
                        <select
                            value={reason}
                            onChange={(e) => { setReason(e.target.value); setReplaceSize(null); }}
                            className={`mt-1.5 ${fieldClass}`}
                        >
                            <option value="" disabled>Select a reason</option>
                            {Object.entries(RETURN_REASONS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </label>

                    {reason === 'size_issue' && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm font-medium text-amber-900">Do you want to replace the size?</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <ChoiceButton active={replaceSize === true} onClick={() => setReplaceSize(true)}>Yes</ChoiceButton>
                                <ChoiceButton active={replaceSize === false} onClick={() => setReplaceSize(false)}>
                                    No (Standard Return/Refund)
                                </ChoiceButton>
                            </div>
                            {replaceSize && (
                                <div className="mt-4 border-t border-amber-200 pt-4">
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-800">
                                        Select replacement sizes for ordered items:
                                    </p>
                                    <ReplacementSizes
                                        items={items ?? []}
                                        isLoading={items === null}
                                        sizes={sizes}
                                        onChange={(index, size) => setSizes((prev) => ({ ...prev, [index]: size }))}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {reason === 'damaged_product' && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                            <label className="block text-sm font-medium text-red-900">
                                Unboxing Video
                                <span className="mt-1 block text-xs font-normal text-red-800">
                                    Upload the video you recorded while unpacking your parcel. MP4, MOV or WebM, up to {MAX_VIDEO_MB} MB.
                                </span>
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={pickVideo}
                                    className="mt-3 block w-full text-sm font-normal text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 file:shadow-sm"
                                />
                            </label>
                        </div>
                    )}

                    <label className="block text-sm font-medium text-zinc-800">
                        Additional Comments (Optional)
                        <textarea
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            maxLength={1000}
                            rows={3}
                            placeholder="Provide any extra details…"
                            className="mt-1.5 w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900 outline-none focus:border-zinc-600"
                        />
                    </label>

                    <p className="text-xs text-zinc-500">
                        A {money(RETURN_FEE)} return fee applies. You'll pay it by card on the next step.
                    </p>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
                        <Button onClick={submit} disabled={!canSubmit} className={primaryClass}>
                            {isBusy ? 'Submitting…' : 'Submit Return'}
                        </Button>
                    </AlertDialogFooter>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
