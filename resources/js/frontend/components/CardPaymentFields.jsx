import { CardCvcElement, CardExpiryElement, CardNumberElement } from '@stripe/react-stripe-js';

// Set this to the real path of your Monstrate font file (must be served with CORS headers).
const MONSTRATE_FONT_URL = '/fonts/monstrate.woff2';
const STRIPE_FONT_FAMILY = 'Monstrate, Arial, sans-serif';

const baseElementStyle = {
    style: {
        base: {
            color: '#18181b',
            fontFamily: STRIPE_FONT_FAMILY,
            fontSize: '15px',
            '::placeholder': {
                color: '#71717a',
                textTransform: 'none',
            },
        },
        invalid: {
            color: '#dc2626',
        },
    },
};

const cardNumberOptions = {
    ...baseElementStyle,
    placeholder: 'Card number',
    showIcon: false,
    disableLink: true,
};
const cardExpiryOptions = { ...baseElementStyle, placeholder: 'MM / YY' };
const cardCvcOptions = { ...baseElementStyle, placeholder: 'CVC' };

const KNOWN_BRANDS = ['visa', 'mastercard', 'amex'];

const OTHER_BRANDS = [
    {
        id: 'discover',
        name: 'Discover',
        logo: (
            <span className="flex flex-col items-center leading-none">
                <span className="text-[0.36rem] font-black tracking-tight text-zinc-800">DISCOVER</span>
                <span className="mt-0.5 h-1.5 w-5 rounded-full bg-gradient-to-r from-[#ff6000] to-[#f9a01b]" />
            </span>
        ),
    },
    {
        id: 'diners',
        name: 'Diners Club',
        logo: (
            <span className="flex h-4 w-4 items-center justify-center rounded-full border-[3px] border-[#0079be] bg-white">
                <span className="h-2 w-[2px] bg-[#0079be]" />
            </span>
        ),
    },
    {
        id: 'elo',
        name: 'Elo',
        logo: <span className="text-[0.7rem] font-black lowercase leading-none tracking-tighter text-zinc-900">elo</span>,
    },
    {
        id: 'jcb',
        name: 'JCB',
        logo: (
            <span className="flex gap-px">
                <span className="flex h-3.5 w-2.5 items-center justify-center rounded-sm bg-[#0b4ea2] text-[0.4rem] font-bold text-white">J</span>
                <span className="flex h-3.5 w-2.5 items-center justify-center rounded-sm bg-[#d4112f] text-[0.4rem] font-bold text-white">C</span>
                <span className="flex h-3.5 w-2.5 items-center justify-center rounded-sm bg-[#00954f] text-[0.4rem] font-bold text-white">B</span>
            </span>
        ),
    },
    {
        id: 'unionpay',
        name: 'UnionPay',
        logo: (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-r from-[#e21836] via-[#00447c] to-[#007b84]">
                <span className="text-[0.36rem] font-bold leading-none tracking-tight text-white">UnionPay</span>
            </span>
        ),
    },
];

/** Options for the <Elements> provider so the card fields render in the site font */
export function cardElementsOptions() {
    return {
        fonts: [
            {
                family: 'Monstrate',
                src: `url(${window.location.origin}${MONSTRATE_FONT_URL})`,
                weight: '400',
                style: 'normal',
                display: 'swap',
            },
        ],
    };
}

function cardBoxClass(hasError, isBlinking) {
    return `font-monstrate flex h-14 w-full items-center rounded-lg border bg-white px-3.5 transition-colors ${
        hasError || isBlinking
            ? 'border-red-600 ring-1 ring-red-600'
            : 'border-zinc-300 hover:border-zinc-500 focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900'
    } ${isBlinking ? 'animate-[pulse_0.5s_ease-in-out_infinite]' : ''}`;
}

function CardBrandBadges({ brand }) {
    const isKnown = KNOWN_BRANDS.includes(brand);
    const activeOtherBrand = OTHER_BRANDS.find((item) => item.id === brand);
    const isOther = brand !== 'unknown' && !isKnown;

    // Treat Amex, Visa, and Mastercard as single brands when they are active
    const isSingleBrand = brand === 'visa' || brand === 'mastercard' || brand === 'amex' || (!isKnown && brand !== 'unknown');

    const fade = (id) =>
        brand !== 'unknown' && brand !== id ? 'opacity-30 grayscale' : 'opacity-100';

    const showVisa = !isSingleBrand || brand === 'visa';
    const showMastercard = !isSingleBrand || brand === 'mastercard';
    const showAmex = !isSingleBrand || brand === 'amex';

    return (
        <span className="flex items-center gap-1.5">
            {activeOtherBrand ? (
                <span className="flex items-center gap-1.5">
                    <span
                        title={activeOtherBrand.name}
                        className="flex h-6 w-9 items-center justify-center overflow-hidden rounded border border-zinc-300 bg-white shadow-sm"
                    >
                        {activeOtherBrand.logo}
                    </span>
                    <span className="text-[0.7rem] font-bold uppercase text-zinc-800">
                        {activeOtherBrand.name}
                    </span>
                </span>
            ) : (
                <>
                    {showVisa && (
                        <span className={`rounded bg-[#1434cb] px-2 py-1 text-[0.65rem] font-bold italic text-white transition ${fade('visa')}`}>
                            VISA
                        </span>
                    )}

                    {showMastercard && (
                        <span className={`flex h-6 w-9 items-center justify-center rounded border border-zinc-200 bg-white transition ${fade('mastercard')}`}>
                            <span className="h-3.5 w-3.5 rounded-full bg-[#eb001b]" />
                            <span className="-ml-1.5 h-3.5 w-3.5 rounded-full bg-[#f79e1b] opacity-90" />
                        </span>
                    )}

                    {showAmex && (
                        <span className={`rounded bg-[#1f72cd] px-1.5 py-1 text-[0.6rem] font-bold text-white transition ${fade('amex')}`}>
                            AMEX
                        </span>
                    )}

                    {!isSingleBrand && (
                        <span className="group relative">
                            <button
                                type="button"
                                aria-label="Show other accepted cards"
                                onClick={(event) => event.preventDefault()}
                                className={`rounded border px-1.5 py-1 text-[0.65rem] transition ${
                                    isOther ? 'border-zinc-900 text-zinc-900' : 'border-zinc-200 text-zinc-600'
                                } ${brand !== 'unknown' && !isOther ? 'opacity-30' : ''} hover:border-zinc-900 hover:text-zinc-900`}
                            >
                                +5
                            </button>

                            <span
                                role="tooltip"
                                className="pointer-events-none invisible absolute bottom-full right-[-6px] z-30 mb-2 w-[168px] rounded-md bg-[#1a1a1a] p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
                            >
                                <span className="flex flex-wrap gap-1.5">
                                    {OTHER_BRANDS.map((item) => (
                                        <span
                                            key={item.id}
                                            title={item.name}
                                            className={`flex h-5 w-8 items-center justify-center overflow-hidden rounded-[3px] bg-white transition ${
                                                brand !== 'unknown' && brand !== item.id ? 'opacity-40' : 'opacity-100'
                                            }`}
                                        >
                                            {item.logo}
                                        </span>
                                    ))}
                                </span>
                                <span className="absolute -bottom-1 right-[15px] h-2 w-2 rotate-45 bg-[#1a1a1a]" />
                            </span>
                        </span>
                    )}
                </>
            )}
        </span>
    );
}

function FieldError({ message }) {
    return message ? <p className="mt-1.5 text-[0.85rem] text-red-600">{message}</p> : null;
}

/**
 * The "Credit / Debit Card" box used by checkout and the return fee payment.
 * Controlled: the parent owns the brand, error messages and name so it can validate on submit.
 * `fieldRef` and `blinkingField` let checkout scroll to and flash the first invalid field.
 */
export default function CardPaymentFields({
    brand,
    errors,
    nameOnCard,
    onNameOnCardChange,
    onNameOnCardBlur,
    onFieldChange,
    onFieldBlur,
    selected = true,
    onSelect,
    fieldRef = () => undefined,
    blinkingField = null,
}) {
    return (
        <div className={`rounded-lg border ${selected ? 'border-zinc-900' : 'border-zinc-300'}`}>
            <label className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 rounded-t-lg bg-white px-4 py-4">
                <span className="flex items-center gap-3 text-[0.9rem] font-medium text-zinc-900">
                    <input
                        type="radio"
                        name="payment_method"
                        checked={selected}
                        onChange={() => onSelect?.()}
                        className="h-4 w-4 accent-zinc-900"
                    />
                    Credit / Debit Card
                </span>
                <div className="pl-7 sm:pl-0 scale-[0.85] origin-left sm:origin-right">
                    <CardBrandBadges brand={brand} />
                </div>
            </label>

            <div className={`space-y-3 rounded-b-lg border-t border-zinc-200 bg-zinc-100 px-4 pb-4 pt-4 ${selected ? '' : 'hidden'}`}>
                {/* Card number */}
                <div ref={fieldRef('number')}>
                    <div className={cardBoxClass(Boolean(errors.number), blinkingField === 'number')}>
                        <div className="min-w-0 flex-1">
                            <CardNumberElement
                                options={cardNumberOptions}
                                onChange={onFieldChange('number')}
                                onBlur={onFieldBlur('number')}
                            />
                        </div>
                        <svg
                            className="h-4 w-4 shrink-0 text-zinc-500"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <rect x="4" y="11" width="16" height="10" rx="2" />
                            <path d="M8 11V7a4 4 0 018 0v4" />
                        </svg>
                    </div>
                    <FieldError message={errors.number} />
                </div>

                {/* Expiry + CVC */}
                <div className="grid grid-cols-2 gap-3">
                    <div ref={fieldRef('expiry')}>
                        <div className={cardBoxClass(Boolean(errors.expiry), blinkingField === 'expiry')}>
                            <div className="min-w-0 flex-1">
                                <CardExpiryElement
                                    options={cardExpiryOptions}
                                    onChange={onFieldChange('expiry')}
                                    onBlur={onFieldBlur('expiry')}
                                />
                            </div>
                        </div>
                        <FieldError message={errors.expiry} />
                    </div>
                    <div ref={fieldRef('cvc')}>
                        <div className={cardBoxClass(Boolean(errors.cvc), blinkingField === 'cvc')}>
                            <div className="min-w-0 flex-1">
                                <CardCvcElement
                                    options={cardCvcOptions}
                                    onChange={onFieldChange('cvc')}
                                    onBlur={onFieldBlur('cvc')}
                                />
                            </div>
                            <span
                                title="3 or 4 digit code on your card"
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-500 text-[0.7rem] text-zinc-600"
                            >
                                ?
                            </span>
                        </div>
                        <FieldError message={errors.cvc} />
                    </div>
                </div>

                {/* Name on card */}
                <div ref={fieldRef('nameOnCard')}>
                    <div className={cardBoxClass(Boolean(errors.nameOnCard), blinkingField === 'nameOnCard')}>
                        <div className="min-w-0 flex-1">
                            <input
                                type="text"
                                value={nameOnCard}
                                onChange={(event) => onNameOnCardChange(event.target.value)}
                                onBlur={onNameOnCardBlur}
                                placeholder="Name on Card"
                                autoComplete="cc-name"
                                style={{ textTransform: 'none' }}
                                className="w-full bg-transparent text-[0.95rem] text-zinc-900 outline-none placeholder:text-zinc-500 placeholder:normal-case border-none p-0 focus:ring-0"
                            />
                        </div>
                    </div>
                    <FieldError message={errors.nameOnCard} />
                </div>
            </div>
        </div>
    );
}
