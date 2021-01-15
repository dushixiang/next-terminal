export function hasPermission(owner) {
    let userJsonStr = sessionStorage.getItem('user');
    let user = JSON.parse(userJsonStr);
    if (user['role'] === 'admin') {
        return true;
    }

    return user['id'] === owner;
}