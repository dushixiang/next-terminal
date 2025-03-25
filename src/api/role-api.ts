import {Api} from "./core/api";
import requests from "./core/requests";
import {Menu} from "@/src/api/account-api";

export interface Role {
    id: string;
    name: string;
    type: string;
    createdAt: number;
    menus: Menu[];
}

export interface TreeNode {
    key: string;
    title: string;
    value?: string;
    children?: TreeNode[];
    isLeaf: boolean;
}

class RoleApi extends Api<Role> {
    constructor() {
        super("admin/roles");
    }

    getMenus = async () => {
        return await requests.get(`/admin/menus`) as TreeNode[];
    }
}

let roleApi = new RoleApi();
export default roleApi;