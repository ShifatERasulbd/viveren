import { useEffect, useMemo, useRef, useState } from 'react';
import { Menu, Search, ShoppingCart, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import SearchProducts from './search';
import TopBar from './TopBar';
import TextGenerateEffect from './TextGenerateEffect';
import Brand from './Brand';
import MainNav from './MainNav';
import HeaderTools from './HeaderTools';
import MobileMenu from './MobileMenu';
import { getSettingsPayload, onSettingsUpdated } from '../../utils/siteSettings';
import { useCart } from '../context/CartContext';
import { timelessFontClass } from '../utils/typography';

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

function toSearchSlug(value = '') {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]+/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const utilityIcons = [
    { label: 'Account', icon: UserRound, href: '/login' },
    { label: 'Search', icon: Search, href: '#search' },
    { label: 'Cart', icon: ShoppingCart, href: '#cart' },
];

export default function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const { itemCount, openCartDrawer } = useCart();
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [grandChilds, setGrandChilds] = useState([]);
    const [isNavigationLoading, setIsNavigationLoading] = useState(true);
    const [siteSettings, setSiteSettings] = useState(() => getSettingsPayload());
    const [isShopMegaMenuOpen, setIsShopMegaMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [expandedMobileItems, setExpandedMobileItems] = useState({});
    const [expandedMobileSubItems, setExpandedMobileSubItems] = useState({});
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [heroHeaderText, setHeroHeaderText] = useState('');
    const [heroHeaderItems, setHeroHeaderItems] = useState([]);
    const [heroHeaderIndex, setHeroHeaderIndex] = useState(0);
    
    
    const closeMenuTimerRef = useRef(null);
    const searchInputRef = useRef(null);

    function openMobileMenu() {
        setIsMobileMenuOpen(true);
    }

    function closeMobileMenu() {
        setIsMobileMenuOpen(false);
    }

    function openSearch() {
        closeShopMenuImmediately();
        closeMobileMenu();
        setIsSearchOpen(true);
    }

    function closeSearch() {
        setIsSearchOpen(false);
    }

    function handleLogoClick(event) {
        try {
            event?.preventDefault();
        } catch (e) {}

        closeShopMenuImmediately();
        closeMobileMenu();
        closeSearch();

        if (location && location.pathname !== '/') {
            navigate('/');
            window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 40);
            return;
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleSearchSubmit(event) {
        event.preventDefault();

        const normalized = String(searchQuery || '').trim();
        closeSearch();

        if (!normalized) {
            navigate('/shop');
            return;
        }

        const searchSlug = toSearchSlug(normalized);
        if (!searchSlug) {
            navigate('/shop');
            return;
        }

        navigate(`/search/${encodeURIComponent(searchSlug)}`);
    }

    function handleOpenCart() {
        // Close menus and open cart drawer
        closeShopMenuImmediately();
        closeMobileMenu();
        closeSearch();

        try {
            openCartDrawer();
        } catch (e) {
            // fallback if openCartDrawer is not available
            console.warn('openCartDrawer not available', e);
        }
    }

    function toggleMobileItem(itemKey) {
        if (!itemKey) {
            return;
        }

        setExpandedMobileItems((previous) => ({
            ...previous,
            [itemKey]: !previous[itemKey],
        }));
    }

    function toggleMobileSubItem(itemKey, subItemKey) {
        if (!itemKey || !subItemKey) {
            return;
        }

        const nestedKey = `${itemKey}:${subItemKey}`;

        setExpandedMobileSubItems((previous) => ({
            ...previous,
            [nestedKey]: !previous[nestedKey],
        }));
    }

    function cancelShopMenuClose() {
        if (closeMenuTimerRef.current) {
            window.clearTimeout(closeMenuTimerRef.current);
            closeMenuTimerRef.current = null;
        }
    }

    function openShopMenu() {
        cancelShopMenuClose();
        setIsShopMegaMenuOpen(true);
    }

    function closeShopMenuWithDelay() {
        cancelShopMenuClose();
        closeMenuTimerRef.current = window.setTimeout(() => {
            setIsShopMegaMenuOpen(false);
        }, 220);
    }

    function closeShopMenuImmediately() {
        cancelShopMenuClose();
        setIsShopMegaMenuOpen(false);
    }

    useEffect(() => {
        if (!isMobileMenuOpen && !isSearchOpen) {
            document.body.style.removeProperty('overflow');
            return;
        }

        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.removeProperty('overflow');
        };
    }, [isMobileMenuOpen, isSearchOpen]);

    useEffect(() => {
        if (!isMobileMenuOpen) {
            setExpandedMobileItems({});
            setExpandedMobileSubItems({});
        }
    }, [isMobileMenuOpen]);

    useEffect(() => {
        if (!isSearchOpen) {
            return;
        }

        const timerId = window.setTimeout(() => {
            searchInputRef.current?.focus();
        }, 20);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [isSearchOpen]);

    useEffect(() => {
        // Subscribe to settings updates so header logo and text update when available
        const unsubscribe = onSettingsUpdated((payload) => {
            setSiteSettings(payload || {});
        });

        // Initialize from any already-bootstrapped payload
        setSiteSettings(getSettingsPayload() || {});

        return unsubscribe;
    }, []);

    useEffect(() => {
        let ignore = false;

        async function loadHeroHeader() {
            try {
                const response = await fetch('/api/public/hero', {
                    headers: { Accept: 'application/json' },
                });

                if (!response.ok) {
                    return;
                }

                const payload = await response.json();
                if (!ignore) {
                    const items = Array.isArray(payload?.header_title_items)
                        ? payload.header_title_items.map((item) => String(item || '').trim()).filter(Boolean)
                        : [];
                    const fallback = String(payload?.header_title || '').trim();
                    const safeItems = items.length > 0 ? items : (fallback ? [fallback] : []);
                    setHeroHeaderItems(safeItems);
                    setHeroHeaderIndex(0);
                    setHeroHeaderText(safeItems[0] || fallback);
                }
            } catch {
                // Keep the fallback text when the hero endpoint is unavailable.
            }
        }

        loadHeroHeader();

        return () => {
            ignore = true;
        };
    }, []);

    useEffect(() => {
        function handleHeroPreviewMessage(event) {
            if (event.origin !== window.location.origin) {
                return;
            }

            const data = event.data;
            if (data?.type !== 'TIMLESS_PAGE_BUILDER_HERO_PREVIEW_UPDATE') {
                return;
            }

            const items = Array.isArray(data.payload?.header_title_items)
                ? data.payload.header_title_items.map((item) => String(item || '').trim()).filter(Boolean)
                : [];
            const fallback = String(data.payload?.header_title || '').trim();
            const safeItems = items.length > 0 ? items : (fallback ? [fallback] : []);
            setHeroHeaderItems(safeItems);
            setHeroHeaderIndex(0);
            setHeroHeaderText(safeItems[0] || fallback);
        }

        window.addEventListener('message', handleHeroPreviewMessage);
        return () => window.removeEventListener('message', handleHeroPreviewMessage);
    }, []);

    useEffect(() => {
        if (heroHeaderItems.length <= 1) {
            return;
        }

        const intervalId = window.setInterval(() => {
            setHeroHeaderIndex((current) => (current + 1) % heroHeaderItems.length);
        }, 2400);

        return () => window.clearInterval(intervalId);
    }, [heroHeaderItems]);

    useEffect(() => {
        if (heroHeaderItems.length > 0) {
            setHeroHeaderText(heroHeaderItems[heroHeaderIndex] || heroHeaderItems[0] || '');
        }
    }, [heroHeaderIndex, heroHeaderItems]);

    useEffect(() => {
        let ignore = false;

        async function loadNavigation() {
            setIsNavigationLoading(true);

            try {
                const [categoriesRes, subCategoriesRes, grandChildsRes] = await Promise.all([
                    fetch('/api/public/categories', { headers: { Accept: 'application/json' } }),
                    fetch('/api/public/sub-categories', { headers: { Accept: 'application/json' } }),
                    fetch('/api/public/grand-childs', { headers: { Accept: 'application/json' } }),
                ]);

                const [categoriesPayload, subCategoriesPayload, grandChildsPayload] = await Promise.all([
                    categoriesRes.ok ? categoriesRes.json() : [],
                    subCategoriesRes.ok ? subCategoriesRes.json() : [],
                    grandChildsRes.ok ? grandChildsRes.json() : [],
                ]);

                if (ignore) return;

                setCategories(Array.isArray(categoriesPayload) ? categoriesPayload : (Array.isArray(categoriesPayload?.data) ? categoriesPayload.data : []));
                setSubCategories(Array.isArray(subCategoriesPayload) ? subCategoriesPayload : (Array.isArray(subCategoriesPayload?.data) ? subCategoriesPayload.data : []));
                setGrandChilds(Array.isArray(grandChildsPayload) ? grandChildsPayload : (Array.isArray(grandChildsPayload?.data) ? grandChildsPayload.data : []));
            } catch (e) {
                // ignore fetch errors and keep defaults
            } finally {
                if (!ignore) setIsNavigationLoading(false);
            }
        }

        loadNavigation();

        return () => {
            ignore = true;
        };
    }, []);

    const visibleCategories = useMemo(() => {
        if (!Array.isArray(categories) || categories.length === 0) {
            return [];
        }

        const homepageCategories = categories.filter((category) =>
            Boolean(category?.show_homepage ?? true)
        );

        return homepageCategories.length > 0 ? homepageCategories : categories;
    }, [categories]);

    const navigationItems = useMemo(() => {
        const categoryItems = visibleCategories.length > 0
            ? visibleCategories.map((category) => {
                const categoryLabel = category?.name || 'Category';
                const categorySlug = String(category?.slug || '').trim().toLowerCase();
                const categoryHref = categorySlug === 'shop'
                    ? '/shop'
                    : categorySlug === 'new-arrivals'
                    ? '/new-arrivals'
                    : categorySlug === 'trending'
                    ? '/trending'
                    : categorySlug === 'best-sellers'
                    ? '/trending'
                    : `/${encodeURIComponent(category?.slug || String(category?.id || ''))}`;

                return {
                    id: category?.id,
                    slug: category?.slug,
                    label: categoryLabel,
                    href: categoryHref,
                    isShop:
                        String(categoryLabel).trim().toLowerCase() === 'shop' ||
                        String(category?.slug || '').trim().toLowerCase() === 'shop',
                };
            })
            : [
                { label: 'Trending', href: '/trending' },
                { label: 'Shop', href: '/shop', isShop: true },
            ];

        return [
            ...categoryItems,
            { label: 'About', href: '/about' },
            { label: 'Contact', href: '/contact' },
        ];
    }, [visibleCategories]);

    const shopNavItem = useMemo(
        () =>
            navigationItems.find((item) =>
                String(item?.label || '').trim().toLowerCase() === 'shop' ||
                String(item?.slug || '').trim().toLowerCase() === 'shop'
            ) || null,
        [navigationItems]
    );

    const shopMegaMenuImage = useMemo(
        () => resolveMediaUrl(siteSettings?.shop_menu_image || ''),
        [siteSettings],
    );

    const shopMegaMenuCaption = 'Shop New Arrivals';

   

    const shopMegaMenuHref = shopNavItem?.href || '/shop';

    const shopChildColumns = useMemo(() => {
        if (!shopNavItem) {
            return [];
        }

        const shopSubCategories = subCategories.filter(
            (subCategory) => Number(subCategory?.category_id) === Number(shopNavItem?.id)
        );

        const grandChildsBySubCategory = grandChilds.reduce((grouped, grandChild) => {
            const subCategoryId = Number(grandChild?.sub_category_id ?? grandChild?.child_id);
            if (!subCategoryId) return grouped;

            const existing = grouped.get(subCategoryId) || [];
            existing.push(grandChild);
            grouped.set(subCategoryId, existing);
            return grouped;
        }, new Map());

        return shopSubCategories.map((subCategory) => {
            const subCategorySlug = String(subCategory?.slug || '').trim() || String(subCategory?.id || '');
            const childHref = `/${encodeURIComponent(subCategorySlug)}`;

            const children =
                grandChildsBySubCategory
                    .get(Number(subCategory?.id))
                    ?.map((grandChild) => ({
                        label: String(grandChild?.name || '').trim() || 'Item',
                        href: `/${encodeURIComponent(subCategorySlug)}/${encodeURIComponent(
                            String(grandChild?.slug || '').trim() || String(grandChild?.id || '')
                        )}`,
                    })) || [];

            return {
                title: subCategory?.name,
                href: childHref,
                items: children,
            };
        });
    }, [shopNavItem, subCategories, grandChilds]);

    const mobileSubCategoriesByItem = useMemo(() => {
        if (!Array.isArray(subCategories) || subCategories.length === 0) {
            return new Map();
        }

        const grandChildsBySubCategory = Array.isArray(grandChilds)
            ? grandChilds.reduce((grouped, grandChild) => {
                const subCategoryId = Number(grandChild?.sub_category_id ?? grandChild?.child_id);
                if (!subCategoryId) {
                    return grouped;
                }

                const existing = grouped.get(subCategoryId) || [];
                existing.push(grandChild);
                grouped.set(subCategoryId, existing);
                return grouped;
            }, new Map())
            : new Map();

        const grouped = new Map();

        navigationItems.forEach((item) => {
            const itemId = Number(item?.id);
            const itemSlug = String(item?.slug || '').trim();
            const itemKey = itemSlug || (itemId ? String(itemId) : '');

            if (!itemKey) {
                return;
            }

            const childItems = subCategories
                .filter((subCategory) => Number(subCategory?.category_id) === itemId)
                .map((subCategory) => {
                    const categoryKey = itemSlug || String(itemId);
                    const subCategoryKey = String(subCategory?.slug || '').trim() || String(subCategory?.id || '');
                    const grandChildItems = (grandChildsBySubCategory.get(Number(subCategory?.id)) || []).map((grandChild) => ({
                        id: grandChild?.id,
                        label: String(grandChild?.name || '').trim() || 'Item',
                        href: `/${encodeURIComponent(subCategoryKey)}/${encodeURIComponent(
                            String(grandChild?.slug || '').trim() || String(grandChild?.id || '')
                        )}`,
                    }));

                    return {
                        id: subCategory?.id,
                        key: subCategoryKey,
                        label: String(subCategory?.name || '').trim() || 'Subcategory',
                        href: `/${encodeURIComponent(subCategoryKey)}`,
                        grandChildItems,
                    };
                });

            if (childItems.length > 0) {
                grouped.set(itemKey, childItems);
            }
        });

        return grouped;
    }, [navigationItems, subCategories, grandChilds]);

    const supportPhone = useMemo(() => {
        return String(
            siteSettings?.phone
            || siteSettings?.phone_number
            || siteSettings?.contact_phone
            || '+1 000-000-0000'
        ).trim();
    }, [siteSettings]);

    const headerLogo = useMemo(() => resolveMediaUrl(siteSettings?.header_logo || ''), [siteSettings]);
    const headerText = heroHeaderText || siteSettings?.header_title ;

    return (
        <>
        <TopBar text={headerText} animate />

        <div className="sr-only">
            <TextGenerateEffect text={headerText} />
        </div>

        <header className={`${timelessFontClass} site-header sticky top-0 z-[300] border-b border-zinc-200 bg-white text-zinc-950 backdrop-blur`}>
           <div className="site-header-inner mx-auto flex h-[90px] w-full max-w-[1920px] items-center justify-between px-4 sm:px-6 lg:px-10 xl:grid xl:grid-cols-[1fr_auto_1fr]">
                <div className="flex items-center justify-start xl:col-start-1 xl:hidden">
                    <button
                        type="button"
                        className="inline-flex size-11 items-center justify-center rounded-full text-zinc-950 transition-colors hover:bg-white/70"
                        aria-label="Open menu"
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="mobile-menu-drawer"
                        onClick={openMobileMenu}
                    >
                        <Menu className="size-5" strokeWidth={1.75} />
                    </button>
                </div>
                

                <Brand headerLogo={headerLogo} onClick={handleLogoClick} siteName={siteSettings?.site_name} />

                <MainNav
                    navigationItems={navigationItems}
                    isNavigationLoading={isNavigationLoading}
                    isShopMegaMenuOpen={isShopMegaMenuOpen}
                    openShopMenu={openShopMenu}
                    closeShopMenuWithDelay={closeShopMenuWithDelay}
                    closeShopMenuImmediately={closeShopMenuImmediately}
                    shopChildColumns={shopChildColumns}
                    shopMegaMenuImage={shopMegaMenuImage}
                    shopMegaMenuCaption={shopMegaMenuCaption}
                    shopMegaMenuHref={shopMegaMenuHref}
                />

                <HeaderTools utilityIcons={utilityIcons} itemCount={itemCount} openSearch={openSearch} handleOpenCart={handleOpenCart} />
            </div>

        </header>

        <MobileMenu
            isMobileMenuOpen={isMobileMenuOpen}
            closeMobileMenu={closeMobileMenu}
            headerLogo={headerLogo}
            navigationItems={navigationItems}
            mobileSubCategoriesByItem={mobileSubCategoriesByItem}
            expandedMobileItems={expandedMobileItems}
            expandedMobileSubItems={expandedMobileSubItems}
            toggleMobileItem={toggleMobileItem}
            toggleMobileSubItem={toggleMobileSubItem}
            handleOpenCart={handleOpenCart}
            supportPhone={supportPhone}
            itemCount={itemCount}
        />

            <div
                className={`fixed inset-0 z-[1400] bg-black/40 transition-opacity duration-200 ${
                    isSearchOpen ? 'visible opacity-100 pointer-events-auto' : 'invisible opacity-0 pointer-events-none'
                }`}
                onClick={closeSearch}
                aria-hidden="true"
            />

          <SearchProducts
              isSearchOpen={isSearchOpen}
              closeSearch={closeSearch}
              handleSearchSubmit={handleSearchSubmit}
              searchInputRef={searchInputRef}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
          />
        </>
    );
}