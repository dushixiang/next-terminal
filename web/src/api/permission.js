import request from "../common/request";

class PermissionApi {
    group = "permissions";

    getMenus = async () => {
        let result = await request.get(`/menus`);
        if (result['code'] !== 1) {
            return [];
        }
        return result['data'];
    }
}

let permissionApi = new PermissionApi();
export default permissionApi;