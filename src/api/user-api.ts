import {Api} from "./core/api";
import requests from "./core/requests";

export interface User {
    id: string;
    username: string;
    nickname: string;
    status: string;
    type: string;
    mail: string;
    source: string;
    createdAt: number;
    roles: string[];
    lastLoginAt: number;
    departments?: SimpleDepartment[];
}

interface SimpleDepartment {
    id: string;
    name: string;
}

export interface LoginLog {
    id: string;
    username: string;
    clientIp: string;
    userAgent?: UserAgent;
    loginAt: number;
    success: boolean;
    reason: string;
    region: string;
}

export interface UserAgent {
    VersionNo: VersionNo;
    OSVersionNo: VersionNo;
    URL: string;
    String: string;
    Name: string;
    Version: string;
    OS: string;
    OSVersion: string;
    Device: string;
    Mobile: boolean;
    Tablet: boolean;
    Desktop: boolean;
    Bot: boolean;
}

export interface VersionNo {
    Major: number;
    Minor: number;
    Patch: number;
}

export interface CreateUserResult {
    id: string;
    nickname: string
    username: string
    password: string
}

class UserApi extends Api<User> {
    constructor() {
        super("admin/users");
    }

    resetTOTP = async (keys: string[]) => {
        await requests.post(`/${this.group}/reset-totp`, keys);
    }

    resetPassword = async (keys: string[], password?: string) => {
        let result = await requests.post(`/${this.group}/reset-password`, {
            'keys': keys,
            'password': password,
        });
        return result['password'];
    }

    changeStatus = async (id: string, status: string) => {
        await requests.patch(`/${this.group}/${id}/status?status=${status}`);
    }

    // 不需要登录
    setupUser = async (values: any) => {
        await requests.post(`/setup-user`, values);
    }

    syncLdapUser = async () => {
        await requests.post(`/${this.group}/sync-from-ldap`);
    }

    import = async (file: File) => {
        let formData = new FormData();
        formData.append("file", file);
        await requests.postForm(`/${this.group}/import`, formData);
    }

    // 获取用户的部门关联
    getUserDepartments = async (userId: string) => {
        return await requests.get(`/${this.group}/${userId}/departments`);
    }

    // 设置用户的部门关联
    setUserDepartments = async (userId: string, departmentIds: string[]) => {
        await requests.post(`/${this.group}/${userId}/departments`, { departmentIds });
    }

    // 批量设置用户部门
    batchSetUserDepartments = async (userIds: string[], departmentIds: string[]) => {
        await requests.post(`/${this.group}/batch-departments`, { userIds, departmentIds });
    }
}

const userApi = new UserApi();
export default userApi;