import { useEffect, useMemo, useState } from 'react';
import { bootstrapPublicSettings, getSettingsPayload, onSettingsUpdated } from '../../utils/siteSettings';

function resolveAssetUrl(path) {
    const value = String(path || '').trim();

    if (!value) {
        return '';
    }

    if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith('/')) {
        return value;
    }

    return `/${value.replace(/^\/+/, '')}`;
}

export default function ContactInformationPanel() {
    const [siteSettings, setSiteSettings] = useState(() => getSettingsPayload() || {});

    useEffect(() => {
        bootstrapPublicSettings().then((payload) => setSiteSettings(payload || {}));

        const unsubscribe = onSettingsUpdated((payload) => {
            setSiteSettings(payload || {});
        });

        return unsubscribe;
    }, []);

    const email = useMemo(() => String(siteSettings?.email || '').trim(), [siteSettings]);
    const socialLinks = useMemo(
        () => (Array.isArray(siteSettings?.social_media) ? siteSettings.social_media : [])
            .map((item, index) => ({
                label: String(item?.name || '').trim() || `Social media ${index + 1}`,
                href: String(item?.link || '').trim(),
                icon: resolveAssetUrl(item?.icon),
            }))
            .filter((item) => item.href),
        [siteSettings],
    );

    return (
        <div>
            <h2 className="font-serif text-[1.9rem] uppercase tracking-[0.02em] text-zinc-900 sm:text-[2.2rem]">
                Contact Information
            </h2>

            <div className="mt-10 space-y-8 text-zinc-600">
                {email && (
                    <div>
                        <h3 className="text-[0.95rem] font-semibold uppercase tracking-[0.06em] text-zinc-900">
                            Email
                        </h3>
                        <p className="mt-3 text-[1rem] leading-8">
                            <a href={`mailto:${email}`} className="transition-colors hover:text-zinc-900">
                                {email}
                            </a>
                        </p>
                    </div>
                )}

                {socialLinks.length > 0 && (
                    <div>
                        <h3 className="text-[0.95rem] font-semibold uppercase tracking-[0.06em] text-zinc-900">
                            Social Info
                        </h3>

                        <div className="mt-3 flex items-center gap-3">
                            {socialLinks.map(({ label, icon, href }, index) => (
                                <a
                                    key={`${label}-${index}`}
                                    href={href}
                                    aria-label={label}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex size-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-900"
                                >
                                    {icon ? (
                                        <img src={icon} alt="" className="size-4 object-contain" />
                                    ) : (
                                        <span className="text-xs font-semibold">{label.slice(0, 1).toUpperCase()}</span>
                                    )}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
