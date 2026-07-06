import React from 'react';
import { Link } from 'react-router-dom';
import { X, UserCircle2, Plus } from 'lucide-react';

export default function MobileMenu({
    isMobileMenuOpen,
    closeMobileMenu,
    headerLogo,
    navigationItems,
    mobileSubCategoriesByItem,
    expandedMobileItems,
    expandedMobileSubItems,
    toggleMobileItem,
    toggleMobileSubItem,
    handleOpenCart,
    supportPhone,
    itemCount,
}) {
    return (
        <>
            <div
                className={`fixed inset-0 z-[1200] bg-black/35 transition-opacity duration-200 xl:hidden ${
                    isMobileMenuOpen ? 'visible opacity-100 pointer-events-auto' : 'invisible opacity-0 pointer-events-none'
                }`}
                onClick={closeMobileMenu}
                aria-hidden="true"
            />

            <aside
                id="mobile-menu-drawer"
                className={`font-monstrate fixed inset-y-0 left-0 z-[1210] h-screen w-[88vw] max-w-[380px] bg-[#f4f4f4] shadow-[18px_0_48px_rgba(0,0,0,0.15)] transition-transform duration-300 xl:hidden ${
                    isMobileMenuOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
                }`}
                aria-label="Mobile menu"
            >
                <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-4">
                        <div className="flex items-center gap-3">
                            {headerLogo ? (
                                <img src={headerLogo} alt="Logo" className="h-9 w-auto max-w-[170px] object-contain" />
                            ) : (
                                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-zinc-700">Menu</p>
                            )}
                        </div>

                        <button type="button" onClick={closeMobileMenu} aria-label="Close menu" className="inline-flex size-9 items-center justify-center rounded-full bg-[#E4B037] text-zinc-900 transition-opacity hover:opacity-90">
                            <X className="size-4" strokeWidth={2} />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-4 py-5" aria-label="Mobile primary">
                        <ul className="space-y-0 border-t border-zinc-200/80">
                            {navigationItems.map((item) => {
                                const itemId = Number(item?.id);
                                const itemSlug = String(item?.slug || '').trim();
                                const itemKey = itemSlug || (itemId ? String(itemId) : '');
                                const childItems = itemKey ? mobileSubCategoriesByItem.get(itemKey) || [] : [];
                                const hasChildren = childItems.length > 0;
                                const isExpanded = Boolean(itemKey && expandedMobileItems[itemKey]);

                                return (
                                    <li key={`mobile-${item.label}`} className="border-b border-zinc-200/80">
                                        <div className="flex items-center justify-between gap-2 px-1 py-4">
                                            <Link to={item.href} onClick={closeMobileMenu} className="min-w-0 flex-1 text-[0.88rem] font-semibold uppercase tracking-[0.04em] text-zinc-900">
                                                <span>{item.label}</span>
                                            </Link>

                                            {hasChildren ? (
                                                <button type="button" onClick={() => toggleMobileItem(itemKey)} aria-label={`Toggle ${item.label} subcategories`} aria-expanded={isExpanded} aria-controls={`mobile-submenu-${itemKey}`} className="inline-flex size-8 items-center justify-center rounded-md text-zinc-700 transition-colors hover:bg-zinc-200/70">
                                                    <Plus className={`size-4 transition-transform duration-200 ${isExpanded ? 'rotate-45' : 'rotate-0'}`} strokeWidth={2.1} />
                                                </button>
                                            ) : null}
                                        </div>

                                        {hasChildren && isExpanded ? (
                                            <ul id={`mobile-submenu-${itemKey}`} className="pb-3 pl-3 pr-1">
                                                {childItems.map((child) => {
                                                    const subItemKey = String(child?.key || child?.id || '');
                                                    const grandChildItems = Array.isArray(child?.grandChildItems) ? child.grandChildItems : [];
                                                    const hasGrandChilds = grandChildItems.length > 0;
                                                    const nestedKey = `${itemKey}:${subItemKey}`;
                                                    const isSubExpanded = Boolean(subItemKey && expandedMobileSubItems[nestedKey]);

                                                    return (
                                                        <li key={`mobile-submenu-${itemKey}-${child.id}`}>
                                                            <div className="flex items-center justify-between gap-2 py-2 pr-1">
                                                                <Link to={child.href} onClick={closeMobileMenu} className="min-w-0 flex-1 text-[0.8rem] font-medium uppercase tracking-[0.03em] text-zinc-700">
                                                                    {child.label}
                                                                </Link>

                                                                {hasGrandChilds ? (
                                                                    <button type="button" onClick={() => toggleMobileSubItem(itemKey, subItemKey)} aria-label={`Toggle ${child.label} items`} aria-expanded={isSubExpanded} aria-controls={`mobile-submenu-${itemKey}-${subItemKey}`} className="inline-flex size-7 items-center justify-center rounded-md text-zinc-700 transition-colors hover:bg-zinc-200/70">
                                                                        <Plus className={`size-3.5 transition-transform duration-200 ${isSubExpanded ? 'rotate-45' : 'rotate-0'}`} strokeWidth={2.1} />
                                                                    </button>
                                                                ) : null}
                                                            </div>

                                                            {hasGrandChilds && isSubExpanded ? (
                                                                <ul id={`mobile-submenu-${itemKey}-${subItemKey}`} className="pb-1 pl-3">
                                                                    {grandChildItems.map((grandChild) => (
                                                                        <li key={`mobile-grand-child-${itemKey}-${subItemKey}-${grandChild.id}`}>
                                                                            <Link to={grandChild.href} onClick={closeMobileMenu} className="block py-1.5 text-[0.74rem] font-medium uppercase tracking-[0.03em] text-zinc-600">
                                                                                {grandChild.label}
                                                                            </Link>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : null}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="mt-7 border-t border-zinc-200/80 pt-6">
                            <Link to="/login" onClick={closeMobileMenu} className="inline-flex items-center gap-2 text-[0.88rem] font-medium uppercase tracking-[0.03em] text-zinc-800">
                                <UserCircle2 className="size-4" strokeWidth={1.8} />
                                Register/ Login
                            </Link>

                            <button type="button" onClick={handleOpenCart} className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-md bg-[#E4B037] px-4 text-[0.86rem] font-semibold uppercase tracking-[0.04em] text-zinc-950">
                                View Cart {itemCount > 0 ? `(${itemCount})` : ''}
                            </button>
                        </div>

                        <div className="mt-7 border-t border-zinc-200/80 pt-6">
                            <p className="text-[0.84rem] text-zinc-500">To More Inquiry</p>
                            <a href={`tel:${supportPhone}`} className="mt-1 block text-[1.65rem] font-semibold leading-tight text-zinc-900">{supportPhone}</a>
                        </div>
                    </nav>
                </div>
            </aside>
        </>
    );
}
