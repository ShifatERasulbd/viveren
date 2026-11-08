// Stops the browser zooming the whole page with pinch or double-tap on touch screens.
// The viewport meta tag and the touch-action rule in app.css cover Android; iOS Safari
// ignores both for pinch, so its gesture is cancelled here. Components that run their
// own zoom (e.g. ProductImageLightbox) still receive the touch/pointer events.
export function blockPageZoom() {
    if (typeof document === 'undefined') {
        return;
    }

    const preventDefault = (event) => event.preventDefault();

    ['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
        document.addEventListener(type, preventDefault, { passive: false });
    });

    document.addEventListener(
        'touchmove',
        (event) => {
            if (event.touches.length > 1) {
                event.preventDefault();
            }
        },
        { passive: false },
    );
}
