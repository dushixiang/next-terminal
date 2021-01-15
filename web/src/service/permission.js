export function hasPermission(owner) {
    let userJsonStr = sessionStorage.getItem('user');
    let user = JSON.parse(userJsonStr);
    if (user['role'] === 'admin') {
        return true;
    }

    return user['id'] === owner;
}

export function isAdmin(){
    let userJsonStr = sessionStorage.getItem('user');
    let user = JSON.parse(userJsonStr);
    return user['role'] === 'admin';

}