// Accounts created through email-code login start with a placeholder first name and no last name.
export function isProfileIncomplete(user) {
    return !String(user?.first_name || '').trim() || !String(user?.last_name || '').trim();
}
