import React from 'react';
import { Link } from 'react-router-dom';

const buttonBaseClassName = 'inline-flex size-11 items-center justify-center rounded-full text-zinc-950 transition-colors hover:bg-white/70 hover:text-zinc-700';

export default function HeaderTools({ utilityIcons, itemCount, openSearch, handleOpenCart }) {
    const renderAction = ({ label, icon: Icon, href }) => {
        const commonIcon = <Icon className="size-5" strokeWidth={1.75} />;

        if (label === 'Cart') {
            return (
                <button key={label} type="button" aria-label={label} onClick={handleOpenCart} className={`relative ${buttonBaseClassName}`}>
                    {commonIcon}
                    {itemCount > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-semibold leading-4 text-white">
                            {itemCount > 99 ? '99+' : itemCount}
                        </span>
                    ) : null}
                </button>
            );
        }

        if (label === 'Search') {
            return (
                <button key={label} type="button" aria-label={label} onClick={openSearch} className={buttonBaseClassName}>
                    {commonIcon}
                </button>
            );
        }

        if (href?.startsWith('/')) {
            return (
                <Link key={label} to={href} aria-label={label} className={buttonBaseClassName}>
                    {commonIcon}
                </Link>
            );
        }

        return (
            <a key={label} href={href} aria-label={label} className={buttonBaseClassName}>
                {commonIcon}
            </a>
        );
    };

    return (
        <div className="site-header-tools flex items-center justify-end gap-1 sm:gap-2 xl:col-start-3 xl:justify-self-end xl:gap-8">
            <div className="hidden items-center gap-1 xl:flex">
                {utilityIcons.map(renderAction)}
            </div>

            <div className="flex items-center gap-1 xl:hidden">
                {utilityIcons.filter(({ label }) => ['Search', 'Cart'].includes(label)).map(renderAction)}
            </div>
        </div>
    );
}
