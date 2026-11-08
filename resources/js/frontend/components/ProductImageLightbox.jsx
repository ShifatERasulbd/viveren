import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
const TAP_SLOP = 10;
const SWIPE_THRESHOLD = 50;

const IDENTITY = { scale: 1, x: 0, y: 0 };

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

// Full-screen product image viewer. Pinch, double-tap or mouse wheel zooms only
// the image (the page itself never zooms); drag pans a zoomed image; swiping an
// unzoomed image moves to the previous/next one.
export default function ProductImageLightbox({ images, startIndex = 0, onClose }) {
    const count = images.length;
    const [index, setIndex] = useState(() => clamp(startIndex, 0, Math.max(0, count - 1)));
    const [view, setView] = useState(IDENTITY);
    const [isGesturing, setIsGesturing] = useState(false);
    const [swipeOffset, setSwipeOffset] = useState(0);

    const stageRef = useRef(null);
    const imageRef = useRef(null);
    const closeButtonRef = useRef(null);
    const viewRef = useRef(IDENTITY);
    const indexRef = useRef(index);
    indexRef.current = index;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    function goTo(nextIndex) {
        if (count < 2) return;
        viewRef.current = IDENTITY;
        setView(IDENTITY);
        setIndex(((nextIndex % count) + count) % count);
    }

    const goToRef = useRef(goTo);
    goToRef.current = goTo;

    // Lock page scroll, close on Escape, arrow keys switch images.
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        function handleKeys(event) {
            if (event.key === 'Escape') {
                onCloseRef.current?.();
            } else if (event.key === 'ArrowRight') {
                goToRef.current(indexRef.current + 1);
            } else if (event.key === 'ArrowLeft') {
                goToRef.current(indexRef.current - 1);
            }
        }

        window.addEventListener('keydown', handleKeys);
        return () => {
            window.removeEventListener('keydown', handleKeys);
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    // Gesture handling uses native listeners so preventDefault works (React's touch/wheel
    // handlers are passive) and the latest view is read from a ref.
    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return undefined;

        const pointers = new Map();
        let gesture = null;
        let lastTap = { time: 0, x: 0, y: 0 };

        function applyView(next) {
            viewRef.current = next;
            setView(next);
        }

        function stageCenter() {
            const rect = stage.getBoundingClientRect();
            return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
        }

        // Keep the zoomed image covering the screen instead of sliding off it.
        function clampView(scale, x, y) {
            const image = imageRef.current;
            const nextScale = clamp(scale, 1, MAX_SCALE);
            if (!image || nextScale <= 1) return IDENTITY;

            const maxX = Math.max(0, (image.offsetWidth * nextScale - stage.clientWidth) / 2);
            const maxY = Math.max(0, (image.offsetHeight * nextScale - stage.clientHeight) / 2);
            return { scale: nextScale, x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
        }

        // Scale around a screen point (relative to the stage center) so it stays under the finger/cursor.
        function zoomAround(point, fromView, toScale) {
            const nextScale = clamp(toScale, 1, MAX_SCALE);
            const x = point.x - (nextScale * (point.x - fromView.x)) / fromView.scale;
            const y = point.y - (nextScale * (point.y - fromView.y)) / fromView.scale;
            return clampView(nextScale, x, y);
        }

        function beginGesture(afterPinch = false) {
            const current = viewRef.current;
            const { cx, cy } = stageCenter();
            const points = [...pointers.values()];

            if (points.length >= 2) {
                const [a, b] = points;
                gesture = {
                    type: 'pinch',
                    startDistance: Math.max(1, distance(a, b)),
                    startMid: { x: (a.x + b.x) / 2 - cx, y: (a.y + b.y) / 2 - cy },
                    startView: current,
                    cx,
                    cy,
                    moved: true,
                };
            } else if (points.length === 1) {
                const [a] = points;
                let type = current.scale > 1 ? 'pan' : 'swipe';
                if (afterPinch && type === 'swipe') type = 'none';
                gesture = { type, startX: a.x, startY: a.y, startView: current, cx, cy, moved: afterPinch };
            } else {
                gesture = null;
            }
        }

        function handlePointerDown(event) {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            stage.setPointerCapture?.(event.pointerId);
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            setIsGesturing(true);
            beginGesture();
        }

        function handlePointerMove(event) {
            if (!pointers.has(event.pointerId) || !gesture) return;
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

            if (gesture.type === 'pinch') {
                const [a, b] = [...pointers.values()];
                if (!b) return;
                const mid = { x: (a.x + b.x) / 2 - gesture.cx, y: (a.y + b.y) / 2 - gesture.cy };
                const nextScale = (gesture.startView.scale * distance(a, b)) / gesture.startDistance;
                const zoomed = zoomAround(gesture.startMid, gesture.startView, nextScale);
                // Two-finger drag also pans.
                applyView(clampView(zoomed.scale, zoomed.x + mid.x - gesture.startMid.x, zoomed.y + mid.y - gesture.startMid.y));
                return;
            }

            const dx = event.clientX - gesture.startX;
            const dy = event.clientY - gesture.startY;
            if (Math.hypot(dx, dy) > TAP_SLOP) gesture.moved = true;

            if (gesture.type === 'pan') {
                applyView(clampView(gesture.startView.scale, gesture.startView.x + dx, gesture.startView.y + dy));
            } else if (gesture.type === 'swipe' && count > 1) {
                setSwipeOffset(dx);
            }
        }

        function handlePointerEnd(event) {
            if (!pointers.has(event.pointerId)) return;
            pointers.delete(event.pointerId);
            const finished = gesture;

            if (pointers.size > 0) {
                // One finger of a pinch lifted: keep panning with the other.
                beginGesture(finished?.type === 'pinch');
                return;
            }

            gesture = null;
            setIsGesturing(false);
            setSwipeOffset(0);
            if (!finished || event.type === 'pointercancel') return;

            const dx = event.clientX - finished.startX;
            const dy = event.clientY - finished.startY;

            if (finished.type === 'swipe' && count > 1 && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
                goToRef.current(indexRef.current + (dx < 0 ? 1 : -1));
                return;
            }

            if (finished.moved || finished.type === 'none') return;

            // Double tap / double click toggles zoom at that spot.
            const now = Date.now();
            const isDoubleTap = now - lastTap.time < DOUBLE_TAP_MS
                && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < TAP_SLOP * 3;

            if (!isDoubleTap) {
                lastTap = { time: now, x: event.clientX, y: event.clientY };
                return;
            }

            lastTap = { time: 0, x: 0, y: 0 };
            const current = viewRef.current;
            if (current.scale > 1) {
                applyView(IDENTITY);
            } else {
                const point = { x: event.clientX - finished.cx, y: event.clientY - finished.cy };
                applyView(zoomAround(point, current, DOUBLE_TAP_SCALE));
            }
        }

        function handleWheel(event) {
            event.preventDefault();
            const { cx, cy } = stageCenter();
            const current = viewRef.current;
            const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
            applyView(zoomAround({ x: event.clientX - cx, y: event.clientY - cy }, current, current.scale * factor));
        }

        // Belt and braces for iOS: stop the touch from scrolling or zooming anything behind.
        function preventTouchDefault(event) {
            event.preventDefault();
        }

        stage.addEventListener('pointerdown', handlePointerDown);
        stage.addEventListener('pointermove', handlePointerMove);
        stage.addEventListener('pointerup', handlePointerEnd);
        stage.addEventListener('pointercancel', handlePointerEnd);
        stage.addEventListener('wheel', handleWheel, { passive: false });
        stage.addEventListener('touchmove', preventTouchDefault, { passive: false });

        return () => {
            stage.removeEventListener('pointerdown', handlePointerDown);
            stage.removeEventListener('pointermove', handlePointerMove);
            stage.removeEventListener('pointerup', handlePointerEnd);
            stage.removeEventListener('pointercancel', handlePointerEnd);
            stage.removeEventListener('wheel', handleWheel);
            stage.removeEventListener('touchmove', preventTouchDefault);
        };
    }, [count]);

    if (count === 0) return null;

    const image = images[index];
    const transition = isGesturing ? 'none' : 'transform 220ms ease-out';

    return createPortal(
        <div
            className="fixed inset-0 z-[1500] select-none bg-white"
            role="dialog"
            aria-modal="true"
            aria-label="Product images"
        >
            <div ref={stageRef} className="absolute inset-0 touch-none overflow-hidden">
                <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ transform: `translate3d(${swipeOffset}px, 0, 0)`, transition: swipeOffset ? 'none' : transition }}
                >
                    <img
                        key={image}
                        ref={imageRef}
                        src={image}
                        alt={`Product image ${index + 1} of ${count}`}
                        draggable={false}
                        className="block max-h-full max-w-full object-contain"
                        style={{
                            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
                            transition,
                            cursor: view.scale > 1 ? 'grab' : 'zoom-in',
                        }}
                    />
                </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
                <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-medium tracking-[0.12em] text-zinc-800">
                    {count > 1 ? `${index + 1} / ${count}` : ''}
                </span>
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => onClose?.()}
                    className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-md ring-1 ring-zinc-200 transition hover:bg-white"
                    aria-label="Close image viewer"
                >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

            {count > 1 ? (
                <>
                    <button
                        type="button"
                        onClick={() => goTo(index - 1)}
                        className="absolute left-2 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-zinc-900 shadow-md ring-1 ring-zinc-200"
                        aria-label="Previous image"
                    >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => goTo(index + 1)}
                        className="absolute right-2 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-zinc-900 shadow-md ring-1 ring-zinc-200"
                        aria-label="Next image"
                    >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </>
            ) : null}
        </div>,
        document.body,
    );
}
