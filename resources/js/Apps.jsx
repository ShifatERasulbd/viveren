import React, { Suspense, lazy, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';

import CartDrawer from './frontend/components/CartDrawer.jsx';
import Header from './frontend/components/Header.jsx';
import Footer from './frontend/components/Footer.jsx';
import PageSkeleton from './frontend/components/PageSkeleton.jsx';
import { CartProvider } from './frontend/context/CartContext.jsx';
import { bootstrapPublicSettings, getSettingsPayload, onSettingsUpdated } from './utils/siteSettings';
import { initializeGoogleAnalytics, trackPageView } from './utils/googleAnalytics';
import { hasSiteAccess, onSiteAccessChanged } from './utils/siteAccess';

const ComingSoonPage = lazy(() => import('./frontend/pages/comming-soon.jsx'));
const HomePage = lazy(() => import('./frontend/pages/HomePage.jsx'));
const ShopPage = lazy(() => import('./frontend/pages/ShopPage.jsx'));
const SingleProductPage = lazy(() => import('./frontend/pages/singleProduct.jsx'));
const AboutPage = lazy(() => import('./frontend/pages/about.jsx'));
const ContactPage = lazy(() => import('./frontend/pages/contact.jsx'));
const AuthPage = lazy(() => import('./frontend/pages/Auth.jsx'));
const ResetPasswordPage = lazy(() => import('./frontend/pages/ResetPassword.jsx'));
const CheckoutPage = lazy(() => import('./frontend/pages/Checkout.jsx'));
const OrderConfirmationPage = lazy(() => import('./frontend/pages/OrderConfirmation.jsx'));
const PrivacyPage = lazy(() => import('./frontend/pages/PrivacyPage.jsx'));
const TermsPage = lazy(() => import('./frontend/pages/TermsPage.jsx'));
const ShippingPage = lazy(() => import('./frontend/pages/ShippingPage.jsx'));

const SustainabilityPage = lazy(() => import('./frontend/pages/Sustainability.jsx'));

const BRAND_NAME = window.APP_NAME || 'Viveren';

function normalizeAssetPath(value) {
    if (typeof value !== 'string') {
        return '';
    }

    const raw = value.trim();
    if (!raw) {
        return '';
    }

    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) {
        return raw;
    }

    return `/${raw.replace(/^\/+/, '')}`;
}

function resolvePageLabel(pathname) {
    const path = String(pathname || '/').toLowerCase();

    if (path === '/') return 'Home';
    if (path === '/shop') return 'Shop';
    if (path === '/about') return 'About';
    if (path === '/sustainability') return 'Sustainability';
    if (path === '/contact') return 'Contact';
    if (path === '/privacy') return 'Privacy Policy';
    if (path === '/terms') return 'Terms & Conditions';
    if (path === '/shipping') return 'Shipping & Returns';
    if (path === '/checkout') return 'Checkout';
    if (path === '/order-confirmation') return 'Order Confirmation';
    if (path === '/login') return 'Login';
    if (path === '/register') return 'Register';
    if (path.startsWith('/search/')) return 'Search';
    if (path.startsWith('/collection/')) return 'Collection';
    if (path === '/new-arrivals') return 'Collection';
    if (path === '/trending') return 'Trending';
    if (path === '/best-sellers') return 'Best Sellers';
    if (path.startsWith('/product-details/')) return 'Product Details';
    if (path === '/singleproduct') return 'Product Details';
    if (path.startsWith('/reset-password')) return 'Reset Password';
    if (path.split('/').filter(Boolean).length <= 2) return 'Shop';

    return 'Home';
}


function ensureFaviconLink() {
    const existing = document.getElementById('app-favicon');
    if (existing) {
        return existing;
    }

    const link = document.createElement('link');
    link.id = 'app-favicon';
    link.rel = 'icon';
    link.type = 'image/png';
    document.head.appendChild(link);
    return link;
}

const FAVICON_SIZE = 64;
const faviconCache = new Map();

// Trims transparent/white margins and fits the image into a square canvas so
// wide logos stay legible at tab-icon size.
function buildSquareFavicon(src) {
    if (faviconCache.has(src)) {
        return faviconCache.get(src);
    }

    const promise = new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const srcCanvas = document.createElement('canvas');
                srcCanvas.width = img.naturalWidth;
                srcCanvas.height = img.naturalHeight;
                const srcCtx = srcCanvas.getContext('2d');
                srcCtx.drawImage(img, 0, 0);

                const { data, width, height } = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
                let minX = width, minY = height, maxX = -1, maxY = -1;
                for (let y = 0; y < height; y += 1) {
                    for (let x = 0; x < width; x += 1) {
                        const i = (y * width + x) * 4;
                        const isBlank = data[i + 3] < 16 || (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240);
                        if (!isBlank) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }
                if (maxX < 0) {
                    minX = 0; minY = 0; maxX = width - 1; maxY = height - 1;
                }

                const cropW = maxX - minX + 1;
                const cropH = maxY - minY + 1;
                const scale = Math.min(FAVICON_SIZE / cropW, FAVICON_SIZE / cropH);
                const drawW = cropW * scale;
                const drawH = cropH * scale;

                const out = document.createElement('canvas');
                out.width = FAVICON_SIZE;
                out.height = FAVICON_SIZE;
                const outCtx = out.getContext('2d');
                outCtx.imageSmoothingQuality = 'high';
                outCtx.drawImage(
                    srcCanvas,
                    minX, minY, cropW, cropH,
                    (FAVICON_SIZE - drawW) / 2, (FAVICON_SIZE - drawH) / 2, drawW, drawH,
                );
                resolve(out.toDataURL('image/png'));
            } catch {
                resolve(src);
            }
        };
        img.onerror = () => resolve(src);
        img.src = src;
    });

    faviconCache.set(src, promise);
    return promise;
}

function DocumentBrandingManager() {
    const { pathname } = useLocation();
    const [settings, setSettings] = React.useState(() => getSettingsPayload() || {});

    useEffect(() => {
        const unsubscribe = onSettingsUpdated((payload) => {
            setSettings(payload || {});
        });

        setSettings(getSettingsPayload() || {});
        return unsubscribe;
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    useEffect(() => {
        const pageLabel = resolvePageLabel(pathname);
        document.title = `${pageLabel} | ${BRAND_NAME}`;

        const favicon = normalizeAssetPath(settings?.favicon || settings?.header_logo || '');
        if (favicon) {
            buildSquareFavicon(favicon).then((href) => {
                const faviconLink = ensureFaviconLink();
                faviconLink.type = 'image/png';
                faviconLink.href = href;
            });
        }

        // Track page view with Google Analytics
        trackPageView(pathname);
    }, [pathname, settings]);

    useEffect(() => {
        // Initialize Google Analytics when GA measurement ID is available
        const gaId = settings?.google_analytics_id || settings?.ga_measurement_id || '';
        if (gaId && !window.__gaInitialized) {
            initializeGoogleAnalytics(gaId);
            window.__gaInitialized = true;
        }
    }, [settings]);

    return null;
}

function withPageFallback(Component) {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <Component />
        </Suspense>
    );
}

// Gates the whole site behind the coming-soon page until the authorized email unlocks it.
function SiteAccessGate({ children }) {
    const [allowed, setAllowed] = React.useState(() => hasSiteAccess());

    useEffect(() => {
        return onSiteAccessChanged(() => setAllowed(hasSiteAccess()));
    }, []);

    if (!allowed) {
        return withPageFallback(ComingSoonPage);
    }

    return children;
}

function FrontendLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-background text-zinc-950">
            <Header />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
            <CartDrawer />
            <Toaster position="top-right" richColors />
        </div>
    );
}

function AppRouter() {
    useEffect(() => {
        bootstrapPublicSettings();
    }, []);

    return (
        <CartProvider>
            <BrowserRouter>
                <DocumentBrandingManager />
                <SiteAccessGate>
                    <Routes>
                        <Route path="/" element={<FrontendLayout />}>
                            <Route index element={withPageFallback(HomePage)} />
                            <Route path="shop" element={withPageFallback(ShopPage)} />
                            <Route path="search/:productSlug" element={withPageFallback(ShopPage)} />
                            <Route path="collection/:slug" element={withPageFallback(ShopPage)} />
                            <Route path="new-arrivals" element={withPageFallback(ShopPage)} />
                            <Route path="trending" element={withPageFallback(ShopPage)} />
                            <Route path="best-sellers" element={withPageFallback(ShopPage)} />
                           
                            
                            
                            <Route path=":subCategorySlug/:grandChildSlug?" element={withPageFallback(ShopPage)} />
                            <Route path="product-details/:slug/:color?" element={withPageFallback(SingleProductPage)} />
                            <Route path="singleProduct" element={withPageFallback(SingleProductPage)} />
                            <Route path="about" element={withPageFallback(AboutPage)} />
                            <Route path="contact" element={withPageFallback(ContactPage)} />
                            <Route path="sustainability" element={withPageFallback(SustainabilityPage)} />
                            <Route path="privacy" element={withPageFallback(PrivacyPage)} />
                            <Route path="terms" element={withPageFallback(TermsPage)} />
                            <Route path="shipping" element={withPageFallback(ShippingPage)} />
                            <Route path="checkout" element={withPageFallback(CheckoutPage)} />
                            <Route path="order-confirmation" element={withPageFallback(OrderConfirmationPage)} />
                            <Route path="login" element={withPageFallback(AuthPage)} />
                            <Route path="register" element={withPageFallback(AuthPage)} />
                            <Route path="reset-password/:token" element={withPageFallback(ResetPasswordPage)} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </SiteAccessGate>
            </BrowserRouter>
        </CartProvider>
    );
}

const rootElement = document.getElementById('app');

if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        React.createElement(
            React.StrictMode,
            null,
            React.createElement(AppRouter)
        )
    );
}