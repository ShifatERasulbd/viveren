import React from 'react';
import { Link } from 'react-router-dom';

export default function MainNav({
    navigationItems,
    isNavigationLoading,
    isShopMegaMenuOpen,
    openShopMenu,
    closeShopMenuWithDelay,
    closeShopMenuImmediately,
    shopChildColumns,
    shopMegaMenuImage,
    shopMegaMenuCaption,
    shopMegaMenuHref,
}) {
    return (
        <nav className="site-header-nav col-start-1 hidden items-center justify-start gap-5 xl:col-start-2 xl:flex" aria-label="Primary">
            {isNavigationLoading ? (
                <>
                    <div className="h-4 w-20 animate-pulse rounded bg-zinc-200" />
                    <div className="h-4 w-14 animate-pulse rounded bg-zinc-200" />
                    <div className="h-4 w-16 animate-pulse rounded bg-zinc-200" />
                    <div className="h-4 w-16 animate-pulse rounded bg-zinc-200" />
                    <div className="h-4 w-32 animate-pulse rounded bg-zinc-200" />
                </>
            ) : (
                navigationItems.map((item) => {
                    const navKey = `${String(item?.id ?? '')}-${String(item?.label ?? '')}-${String(item?.href ?? '')}`;

                    return item.isShop ? (
                        <div
                            key={navKey}
                            className="relative flex items-center h-full"
                            onMouseEnter={openShopMenu}
                            onMouseLeave={closeShopMenuWithDelay}
                            onFocus={openShopMenu}
                            onBlur={(event) => {
                                if (!event.currentTarget.contains(event.relatedTarget)) {
                                    closeShopMenuWithDelay();
                                }
                            }}
                        >
                            <Link
                                to={item.href}
                                className="site-header-nav-link flex items-center h-full text-[14px] font-medium uppercase tracking-[0.12em] text-zinc-950 transition-opacity hover:opacity-60"
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
                                aria-expanded={isShopMegaMenuOpen}
                                aria-haspopup="menu"
                            >
                                {item.label}
                            </Link>

                            <div
                                className={`fixed left-0 right-0 top-[90px] z-50 w-full overflow-hidden transition-all duration-300 ease-out ${
                                    isShopMegaMenuOpen
                                        ? 'visible max-h-[540px] translate-y-0 opacity-100 pointer-events-auto'
                                        : 'invisible max-h-0 -translate-y-1 opacity-0 pointer-events-none'
                                }`}
                                onMouseEnter={openShopMenu}
                                onMouseLeave={closeShopMenuWithDelay}
                                role="menu"
                            >
                                <div className="border border-zinc-200 bg-white px-4 py-7 shadow-[0_18px_60px_rgba(0,0,0,0.08)] sm:px-6 lg:px-10">
                                    <div className="mx-auto flex w-full max-w-[1920px] items-start gap-10 xl:gap-14">
                                        <div className="min-w-0 flex-1 overflow-x-auto">
                                            <div className="grid min-w-[860px] grid-flow-col auto-cols-[minmax(180px,200px)] gap-12 lg:gap-16">
                                                {shopChildColumns.length > 0 ? (
                                                    shopChildColumns.map((column) => (
                                                        <div key={column.title} className="px-2 py-2">
                                                            <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                                                                <Link to={column.href} className="transition-colors hover:text-zinc-700" onClick={closeShopMenuImmediately}>
                                                                    {column.title}
                                                                </Link>
                                                            </h3>

                                                            <ul className="mt-5 space-y-2 text-[0.98rem] font-medium uppercase leading-7 tracking-[0.01em] text-zinc-600">
                                                                {column.items.map((megaItem) => (
                                                                    <li key={`${column.title}-${megaItem.label}`}>
                                                                        <Link to={megaItem.href} className="transition-colors hover:text-zinc-950" onClick={closeShopMenuImmediately}>
                                                                            {megaItem.label}
                                                                        </Link>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-6 text-sm text-zinc-500">No categories found</div>
                                                )}
                                            </div>
                                        </div>

                                        {shopMegaMenuImage ? (
                                            <div className="flex w-[420px] flex-none justify-center xl:w-[480px]">
                                                <figure className="w-full max-w-[480px] text-center">
                                                    <Link to={shopMegaMenuHref} className="block overflow-hidden border border-zinc-200 bg-zinc-100 p-3" onClick={closeShopMenuImmediately}>
                                                        <img src={shopMegaMenuImage} alt={shopMegaMenuCaption} className="h-[300px] w-full object-contain object-center xl:h-[340px]" />
                                                    </Link>
                                                </figure>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Link
                            key={navKey}
                            to={item.href}
                            className="site-header-nav-link text-[14px] font-medium uppercase tracking-[0.12em] text-zinc-950 transition-opacity hover:opacity-60"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                        >
                            {item.label}
                        </Link>
                    );
                })
            )}
        </nav>
    );
}
