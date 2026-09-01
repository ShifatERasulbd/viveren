const SITE_ACCESS_KEY = 'vv_site_access';
const SITE_ACCESS_EVENT = 'vv-site-access-changed';

export function hasSiteAccess() {
    try {
        return window.localStorage.getItem(SITE_ACCESS_KEY) === 'granted';
    } catch (error) {
        return false;
    }
}

export function grantSiteAccess() {
    try {
        window.localStorage.setItem(SITE_ACCESS_KEY, 'granted');
    } catch (error) {
        // Ignore storage errors (e.g. privacy mode).
    }
    // storage event only fires in other tabs, so notify the current tab too.
    window.dispatchEvent(new Event(SITE_ACCESS_EVENT));
}

export function onSiteAccessChanged(callback) {
    window.addEventListener(SITE_ACCESS_EVENT, callback);
    window.addEventListener('storage', callback);
    return () => {
        window.removeEventListener(SITE_ACCESS_EVENT, callback);
        window.removeEventListener('storage', callback);
    };
}
