import {Api} from "./core/api";
import requests from "@/api/core/requests";

export interface Department {
    id: string;
    name: string;
    parentId: string;
    parentName: string;
    weight: number;
    sort: string;
    createdAt: number;
}

export interface TreeNode {
    title: string;
    key: string;
    value: string;
    children: TreeNode[];
}

class DepartmentApi extends Api<Department> {
    constructor() {
        super("admin/departments");
    }

    updateSort = async (id: string, beforeId?: string, afterId?: string, parentId?: string) => {
        await requests.post<void>(`/${this.group}/sort`, {id, beforeId, afterId, parentId});
    }

    // 获取部门树形结构
    getTree = async (): Promise<TreeNode[]> => {
        return await requests.get(`/${this.group}/tree`);
    }

    // 获取部门的用户列表
    getDepartmentUsers = async (departmentId: string) => {
        return await requests.get(`/${this.group}/${departmentId}/users`) as string[];
    }

    // 设置部门的用户关联
    setDepartmentUsers = async (departmentId: string, userIds: string[]) => {
        await requests.post<void>(`/${this.group}/${departmentId}/users`, userIds);
    }
}

let departmentApi = new DepartmentApi();
export default departmentApi;
