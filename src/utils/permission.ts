import {global} from './global'
import {AccountInfo} from "@/api/account-api";

export function isAdmin() {
    let user = getCurrentUser();
    return user['type'] === 'admin';
}

export function clearCurrentUser() {
    global.user = null;
}

export function setCurrentUser(user: AccountInfo) {
    global.user = user
}

export function getCurrentUser() {
    return global.user;
}

export function hasMenu(...items: string[]) {
    // return true
    let menus = getCurrentUser()?.menus || [];
    let filtered = menus.map(item => item.key);
    for (const item of items) {
        if (filtered.includes(item)) {
            return true;
        }
    }
    return false;
}