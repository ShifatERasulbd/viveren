import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getSettingsPayload, onSettingsUpdated } from '../../utils/siteSettings';
import { timelessFontClass } from '../utils/typography';
import { sectionTypography } from '../utils/sectionTypography';
import ComplianceModal from './ComplianceModal.jsx';
import NewsletterSection from './NewsletterSection.jsx';

const shopLinks = [
    { label: 'Best Sellers', href: '/collections/best-selling-products' },
    { label: 'New Arrivals', href: '/new-arrivals' },
    { label: 'Women', href: '/women' },
    { label: 'Men', href: '/men' },
];

const MODAL_META = {
    terms: { title: 'Terms & Conditions', field: 'terms_and_conditions' },
    privacy: { title: 'Privacy Policy', field: 'privacy_policy' },
    shipping_returns: { title: 'Shipping & Returns', field: 'shipping_and_return' },
};

function resolveAssetUrl(path) {
    if (typeof path !== 'string') return '';
    const raw = path.trim();
    if (!raw) return '';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) {
        return raw;
    }
    return `/${raw.replace(/^\/+/, '')}`;
}

function FooterCol({ heading, links, onOpenModal, onLinkClick }) {
    const linkBaseClass = `font-monstrate ${sectionTypography.footerLink} text-zinc-400 transition-colors hover:text-white`;

    const handleClick = (href, event) => {
        if (onLinkClick) {
            onLinkClick(href, event);
        }
    };

    return (
        <nav aria-label={heading}>
            <h3 className={`font-monstrate ${sectionTypography.footerHeading} text-white`}>
                {heading}
            </h3>
            <ul className="space-y-2.5">
                {links.map(({ label, href, modalKey }) => (
                    <li key={label}>
                        {modalKey ? (
                            <button
                                type="button"
                                onClick={() => onOpenModal(modalKey)}
                                className={`${linkBaseClass} text-left`}
                            >
                                {label}
                            </button>
                        ) : href?.startsWith('/') ? (
                            <Link to={href} className={linkBaseClass} onClick={(event) => handleClick(href, event)}>
                                {label}
                            </Link>
                        ) : (
                            <a href={href} className={linkBaseClass} onClick={(event) => handleClick(href, event)}>
                                {label}
                            </a>
                        )}
                    </li>
                ))}
            </ul>
        </nav>
    );
}

export default function Footer() {
    const [siteSettings, setSiteSettings] = useState(() => getSettingsPayload());
    const [complianceData, setComplianceData] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const isCustomerDashboard = typeof window !== 'undefined' && window.location.pathname.startsWith('/user');

    const handleLinkClick = (href, event) => {
        if (isCustomerDashboard) {
            event.preventDefault();
            window.location.assign(href);
        }
    };

    useEffect(() => {
        let ignore = false;

        async function fetchCompliance() {
            try {
                const response = await fetch('/api/public/compliance', {
                    headers: { Accept: 'application/json' },
                });
                if (!response.ok) return;
                const payload = await response.json();
                if (!ignore && payload) {
                    setComplianceData(payload);
                }
            } catch {}
        }

        fetchCompliance();
        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        const unsubscribe = onSettingsUpdated((payload) => {
            setSiteSettings(payload || {});
        });
        setSiteSettings(getSettingsPayload() || {});
        return unsubscribe;
    }, []);

    const openModal = useCallback((type) => setActiveModal(type), []);
    const closeModal = useCallback(() => setActiveModal(null), []);

    const activeModalMeta = activeModal ? MODAL_META[activeModal] : null;
    const modalContent = activeModalMeta && complianceData ? complianceData[activeModalMeta.field] || '' : '';

    const helpLinks = useMemo(() => [
        { label: 'Contact Us', href: '/contact' },
        { label: 'Shipping', href: '/shipping' },
        { label: 'Returns', href: '/shipping' },
        { label: 'Size Guide', modalKey: 'size_guide' },
    ], []);

    const houseLinks = useMemo(() => [
        { label: 'Sustainability', href: '/sustainability' },
    ], []);

    const footerLogo = useMemo(() => resolveAssetUrl(siteSettings?.footer_logo || ''), [siteSettings]);

    const socialFromSettings = useMemo(() => {
        const items = Array.isArray(siteSettings?.social_media) ? siteSettings.social_media : [];
        return items
            .map((item, index) => ({
                label: String(item?.name || '').trim() || `Social ${index + 1}`,
                href: String(item?.link || '').trim() || '#',
                icon: resolveAssetUrl(item?.icon || ''),
            }))
            .filter((item) => item.label && item.href && item.icon);
    }, [siteSettings]);

    const activeSocials = socialFromSettings;

    return (
        <footer className={`${timelessFontClass} font-monstrate bg-[#1a1a1a] text-white`}>
            <div className="mx-auto w-full max-w-[1700px] px-6 pb-14 pt-14 sm:px-10 lg:px-16">
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">

                    {/* Brand column */}
                    <div className="space-y-4">
                        <Link to="/" className="inline-flex items-center gap-1" onClick={(event) => handleLinkClick('/', event)}>
                            {footerLogo ? (
                                <img
                                    src={footerLogo}
                                    alt="viveren"
                                    className="h-9 w-auto max-w-[220px] object-contain"
                                    loading="lazy"
                                />
                            ) : (
                                <span className="text-3xl font-bold tracking-tight text-white lowercase">
                                    viveren
                                </span>
                            )}
                        </Link>

                        {activeSocials.length > 0 && (
                            <div className="flex items-center gap-3 pt-1">
                                {activeSocials.map((s) => (
                                    <a
                                        key={s.label}
                                        href={s.href}
                                        aria-label={s.label}
                                        className="inline-flex size-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                                    >
                                        <img src={s.icon} alt={s.label} className="size-4 object-contain" loading="lazy" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    <FooterCol heading="Shop" links={shopLinks} onLinkClick={handleLinkClick} />
                    <FooterCol heading="Customer Service" links={helpLinks} onLinkClick={handleLinkClick} />
                    <div className="lg:justify-self-center">
                        <FooterCol heading="Other" links={houseLinks} onLinkClick={handleLinkClick} />
                    </div>
                    <NewsletterSection />
                </div>
            </div>

            <div className="border-t border-zinc-700">
                <div className={`mx-auto flex w-full max-w-[1700px] flex-col items-center justify-between gap-3 px-6 py-5 ${sectionTypography.footerLegal} text-zinc-500 sm:flex-row sm:px-10 lg:px-16`}>
                    <span>© 2026 Viveren. All rights reserved.</span>
                    <div className="flex items-center gap-6">
                        <Link to="/privacy" className="transition-colors hover:text-white" onClick={(event) => handleLinkClick('/privacy', event)}>
                            Privacy
                        </Link>
                        <Link to="/terms" className="transition-colors hover:text-white" onClick={(event) => handleLinkClick('/terms', event)}>
                            Terms
                        </Link>
                        <img
                            src="/cardImage.png"
                            alt="Payment and card information"
                            className="h-6 w-auto object-contain"
                            loading="lazy"
                        />
                    </div>
                </div>
            </div>

        </footer>
    );
}