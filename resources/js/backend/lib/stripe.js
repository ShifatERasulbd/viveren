import { loadStripe } from '@stripe/stripe-js';

let stripePromise = null;

/**
 * Loads Stripe.js once per page, using the same key lookup as checkout:
 * the build-time VITE_STRIPE_KEY first, then the server's public config.
 * Resolves to null when Stripe isn't configured.
 */
export function getStripe() {
    if (!stripePromise) {
        stripePromise = (async () => {
            const envKey = String(import.meta.env.VITE_STRIPE_KEY || '').trim();
            if (envKey) return loadStripe(envKey);

            const response = await fetch('/api/public/stripe-config', { headers: { Accept: 'application/json' } });
            const payload = await response.json().catch(() => ({}));
            const runtimeKey = String(payload?.publishableKey || '').trim();
            return runtimeKey ? loadStripe(runtimeKey) : null;
        })().catch(() => {
            // Let the next caller retry instead of caching the failure
            stripePromise = null;
            return null;
        });
    }
    return stripePromise;
}
