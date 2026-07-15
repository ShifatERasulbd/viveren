import { useEffect, useMemo, useState } from 'react';

// Minimal “text-generate-effect” style animation adapted for this codebase.
// Produces a typed/appearing effect by revealing characters over time.
export default function TextGenerateEffect({
    text = '',
    className = '',
    interval = 18,
    once = true,
    startOnMount = true,
}) {
    const safeText = useMemo(() => String(text ?? ''), [text]);
    const [displayedCount, setDisplayedCount] = useState(0);

    useEffect(() => {
        if (!startOnMount) return;

        let rafId = null;
        let timeoutId = null;
        let intervalId = null;
        let cancelled = false;

        function start() {
            // reset
            setDisplayedCount(0);

            // If text is empty, do nothing.
            if (!safeText) {
                setDisplayedCount(0);
                return;
            }

            let startTime = Date.now();
            const total = safeText.length;

            // Use interval for predictable feel.
            intervalId = window.setInterval(() => {
                if (cancelled) return;

                const elapsed = Date.now() - startTime;
                const next = Math.min(total, Math.floor(elapsed / interval));
                setDisplayedCount(next);

                if (next >= total) {
                    window.clearInterval(intervalId);
                    intervalId = null;
                    if (!once) {
                        // loop
                        startTime = Date.now();
                        setDisplayedCount(0);
                    }
                }
            }, interval);

            // Fallback safety
            timeoutId = window.setTimeout(() => {
                if (cancelled) return;
                setDisplayedCount(total);
                if (intervalId) window.clearInterval(intervalId);
            }, total * interval + 1000);

            // raf not strictly needed; keep to avoid unused warning.
            rafId = window.requestAnimationFrame(() => {});
        }

        start();

        return () => {
            cancelled = true;
            if (rafId) window.cancelAnimationFrame(rafId);
            if (timeoutId) window.clearTimeout(timeoutId);
            if (intervalId) window.clearInterval(intervalId);
        };
    }, [safeText, interval, once, startOnMount]);

    if (!safeText) {
        return null;
    }

    return (
        <span className={className} aria-label={safeText}>
            {Array.from(safeText).map((char, idx) => (
                <span key={idx} className="inline-block">
                    {idx < displayedCount ? (char === ' ' ? '\u00A0' : char) : ''}
                </span>
            ))}
        </span>
    );
}

