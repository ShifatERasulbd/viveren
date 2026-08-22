import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getSettingsPayload, onSettingsUpdated } from '../../utils/siteSettings';
import { timelessFontClass } from '../utils/typography';
import { sectionTypography } from '../utils/sectionTypography';
import ComplianceModal from './ComplianceModal.jsx';

const shopLinks = [
    { label: 'Best Sellers', href: '/collections/best-selling-products' },
    { label: 'New Arrivals', href: '/new-arrivals' },
    { label: 'Women', href: '/women' },
    { label: 'Men', href: '/men' },
];

const socialLinks = [
    {
        label: 'Facebook',
        href: '#facebook',
        icon: (
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z" fill="currentColor" />
        ),
    },
    {
        label: 'X',
        href: '#x',
        icon: (
            <path d="M17.5 4h2.5l-5.5 6.3L21 20h-5.1l-3.5-4.6L8.1 20H5.6l5.9-6.7L4 4h5.2l3.2 4.2L17.5 4Zm-.9 14.4h1.4L7.5 5.4H6L16.6 18.4Z" fill="currentColor" />
        ),
    },
    {
        label: 'Instagram',
        href: '#instagram',
        icon: (
            <>
                <rect x="4.5" y="4.5" width="15" height="15" rx="4" stroke="currentColor" strokeWidth="1.6" fill="none" />
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" fill="none" />
                <circle cx="16.5" cy="7.5" r="1" fill="currentColor" />
            </>
        ),
    },
    {
        label: 'LinkedIn',
        href: '#linkedin',
        icon: (
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" fill="currentColor" />
        ),
    },
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

function FooterCol({ heading, links, onOpenModal }) {
    const linkBaseClass = `font-monstrate ${sectionTypography.footerLink} text-zinc-400 transition-colors hover:text-white`;

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
                            <Link to={href} className={linkBaseClass}>
                                {label}
                            </Link>
                        ) : (
                            <a href={href} className={linkBaseClass}>
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
        { label: 'Mission', href: '#!' },
        { label: 'Sustainability', modalKey: '/sustainability' },
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
            .filter((item) => item.label && item.href);
    }, [siteSettings]);

    const activeSocials = socialFromSettings.length > 0 ? socialFromSettings : socialLinks;

    return (
        <footer className={`${timelessFontClass} font-monstrate bg-[#1a1a1a] text-white`}>
            <div className="mx-auto w-full max-w-[1700px] px-6 pb-14 pt-14 sm:px-10 lg:px-16">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-4">
                    
                    {/* Brand column */}
                    <div className="space-y-4">
                        <Link to="/home" className="inline-flex items-center gap-1">
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

                        <div className="flex items-center gap-3 pt-1">
                            {activeSocials.map((s) => {
                                const isImageUrl = typeof s.icon === 'string' && s.icon.trim() !== '';
                                return (
                                    <a
                                        key={s.label}
                                        href={s.href}
                                        aria-label={s.label}
                                        className="inline-flex size-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                                    >
                                        {isImageUrl ? (
                                            <img src={s.icon} alt={s.label} className="size-4 object-contain" loading="lazy" />
                                        ) : (
                                            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                                                {s.icon}
                                            </svg>
                                        )}
                                    </a>
                                );
                            })}
                        </div>

                        <div className="pt-2">
                            <img
                                src="/cardImage.png"
                                alt="Payment and card information"
                                className="h-7 w-auto max-w-full object-contain object-left"
                                loading="lazy"
                            />
                        </div>
                    </div>

                    <FooterCol heading="Shop" links={shopLinks} />
                    <FooterCol heading="Help" links={helpLinks} onOpenModal={openModal} />
                    <FooterCol heading="House" links={houseLinks} onOpenModal={openModal} />
                </div>
            </div>

            <div className="border-t border-zinc-700">
                <div className={`mx-auto flex w-full max-w-[1700px] flex-col items-center justify-between gap-3 px-6 py-5 ${sectionTypography.footerLegal} text-zinc-500 sm:flex-row sm:px-10 lg:px-16`}>
                    <span>© 2026 Viveren. All rights reserved.</span>
                    <div className="flex items-center gap-6">
                        <Link to="/privacy" className="transition-colors hover:text-white">
                            Privacy
                        </Link>
                        <Link to="/terms" className="transition-colors hover:text-white">
                            Terms
                        </Link>
                       
                    </div>
                </div>
            </div>

            <ComplianceModal
                isOpen={!!activeModal}
                onClose={closeModal}
                title={activeModalMeta?.title || ''}
                content={modalContent}
            />
        </footer>
    );
}