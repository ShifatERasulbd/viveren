import React from 'react';
import { Link } from 'react-router-dom';

export default function Brand({ faviconLogo, headerLogo, onClick, siteName }) {
    const isCustomerDashboard = typeof window !== 'undefined' && window.location.pathname.startsWith('/user');

    const handleClick = (event) => {
        if (isCustomerDashboard) {
            event.preventDefault();
            window.location.assign('/');
            return;
        }

        onClick?.(event);
    };

    return (
        <Link
            to="/"
            onClick={handleClick}
            className="site-header-brand absolute left-1/2 -translate-x-1/2 flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80 xl:relative xl:left-auto xl:translate-x-0 xl:col-start-1 xl:justify-self-start"
            aria-label="Home"
        >
            {faviconLogo ? (
                <img
                    src={faviconLogo}
                    alt=""
                    className="size-7 shrink-0 object-contain sm:size-8"
                />
            ) : null}
            {headerLogo ? (
                <img
                    src={headerLogo}
                    alt={siteName || 'Logo'}
                    className="site-header-brand-logo h-9 w-auto max-w-[220px] object-contain sm:h-11"
                />
            ) : (
                <div className="h-5 w-36 animate-pulse rounded bg-zinc-200 sm:h-6 sm:w-44" />
            )}
        </Link>
    );
}
