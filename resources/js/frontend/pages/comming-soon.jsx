import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettingsPayload, onSettingsUpdated } from '../../utils/siteSettings';
import { grantSiteAccess } from '../../utils/siteAccess';

const BACKGROUND_IMAGE =
  'https://viveren.com/uploads/about/hero/1784550617_about_hero_6a5e14d953fcb5.37550518.png';

function resolveMediaUrl(value = '') {
  const raw = String(value || '').trim();

  if (!raw) {
    return '';
  }

  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) {
    return raw;
  }

  return `/${raw.replace(/^\/+/, '')}`;
}

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [siteSettings, setSiteSettings] = useState(() => getSettingsPayload() || {});
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onSettingsUpdated((payload) => {
      setSiteSettings(payload || {});
    });

    setSiteSettings(getSettingsPayload() || {});
    return unsubscribe;
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim().toLowerCase() === 'it1@arbellafashion.com') {
      setError('');
      grantSiteAccess();
      navigate('/', { replace: true });
      return;
    }
    setError('This email is not authorized to access the site.');
  };

  const footerLogo = resolveMediaUrl(siteSettings?.footer_logo || '');
  const siteName = siteSettings?.site_name || 'Viveren';

  return (
    <div className="relative h-screen w-full overflow-hidden font-sans text-white">
      

      <div
        className="relative flex h-[calc(100vh-32px)] w-full items-end justify-start bg-cover bg-center px-4 md:px-12 lg:px-16"
        style={{
          backgroundImage: `url('${BACKGROUND_IMAGE}')`,
        }}
      >
        <div className="absolute inset-0 z-0 bg-black/40 backdrop-brightness-90"></div>

        <div className="relative z-10 w-full max-w-[1280px] pb-10 md:pb-12">
          <div className="mt-6 flex flex-col items-start md:mt-10">
            
            <div className="mb-6 flex justify-start">
              {footerLogo ? (
                <img
                  src={footerLogo}
                  alt={siteName}
                  className="h-8 w-auto object-contain md:h-10"
                />
              ) : (
                <div className="text-xl font-medium uppercase tracking-[0.2em] text-white/90">
                  {siteName}
                </div>
              )}
            </div>

            <h5 className="mb-6 text-left font-serif text-5xl font-normal leading-[0.95] tracking-[-0.04em] text-white md:text-[2.2rem]">
              Comming Soon
            </h5>

            <p className="mb-8 text-left text-sm leading-relaxed text-gray-200 md:text-[1.05rem]">
              At spring 2027
            </p>

            {/* Shortened form width from max-w-[520px] to max-w-[360px] */}
            <form onSubmit={handleSubmit} className="flex w-full max-w-[360px] flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="email" className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/80">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-0 border-b border-white/80 bg-transparent px-0 py-3 text-sm text-white placeholder:text-gray-300 focus:border-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-4 inline-flex items-center justify-center bg-[#262626] px-8 py-3 text-xs font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#383838] sm:mt-0"
              >
                Login
              </button>
            </form>

            {error ? (
              <p className="mt-3 text-left text-xs text-red-300">{error}</p>
            ) : null}

          </div>
        </div>
      </div>
    </div>
  );
}