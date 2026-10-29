// A nav link is active on its own page and on any page nested under it (e.g. /shop/...).
export function isActivePath(pathname, href) {
    if (!href || !href.startsWith('/')) return false;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
}
