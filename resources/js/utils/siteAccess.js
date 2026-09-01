const SITE_ACCESS_KEY = 'vv_site_access';

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
}
