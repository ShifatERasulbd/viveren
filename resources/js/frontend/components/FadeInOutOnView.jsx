import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Fade in when the element enters the viewport.
 * Fade out (and set visibility:hidden) when it leaves the viewport.
 */
export default function FadeInOutOnView({
    children,
    className = '',
    as: Component = 'div',
    rootMargin = '0px 0px -10% 0px',
    threshold = 0.01,
    durationMs = 700,
    yPx = 10,
}) {
    const [isInView, setIsInView] = useState(false);
    const wrapperRef = useRef(null);

    const transition = useMemo(() => {
        return `opacity ${durationMs}ms ease, transform ${durationMs}ms ease, visibility ${durationMs}ms ease`;
    }, [durationMs]);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry) return;
                setIsInView(entry.isIntersecting);
            },
            {
                root: null,
                rootMargin,
                threshold,
            },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [rootMargin, threshold]);

    return (
        <Component
            ref={wrapperRef}
            className={className}
            style={{
                opacity: isInView ? 1 : 0,
                visibility: isInView ? 'visible' : 'hidden',
                transform: isInView ? 'translateY(0px)' : `translateY(${yPx}px)`,
                transition: transition,
                willChange: 'opacity, transform, visibility',
            }}
        >
            {children}
        </Component>
    );
}


