export const HasPermission = (permission) => {
    let permissionsStr = sessionStorage.getItem('permissions');
    let permissions = JSON.parse(permissionsStr);
    if (!permissions) {
        return false;
    }
    return permissions.includes(permission);
}