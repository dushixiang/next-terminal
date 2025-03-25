import {Api} from "./core/api";
import requests from "./core/requests";

export interface LoginPolicy {
    id: string;
    name: string;
    ipGroup: string;
    priority: number;
    enabled: boolean;
    rule: string;
    expirationAt?: number;
    timePeriod: TimePeriod[];
    createdAt: number;
}

interface TimePeriod {
    key: number;
    value: string;
}

class LoginPolicyApi extends Api<LoginPolicy> {

    constructor() {
        super("admin/login-policies");
    }

    bindUser = async (loginPolicyId: string, data: string[]) => {
        await requests.post(`/${this.group}/bind-user-id?loginPolicyId=${loginPolicyId}`, data);
    }

    unbindUser = async (loginPolicyId: string, data: string[]) => {
        await requests.post(`/${this.group}/unbind-user-id?loginPolicyId=${loginPolicyId}`, data);
    }

    bindLoginPolicy = async (userId: string, data: string[]) => {
        await requests.post(`/${this.group}/bind-login-policy-id?userId=${userId}`, data);
    }

    unbindLoginPolicy = async (userId: string, data: string[]) => {
        await requests.post(`/${this.group}/unbind-login-policy-id?userId=${userId}`, data);
    }

    getUserId = async (loginPolicyId: string) => {
        return await requests.get(`/${this.group}/user-id?loginPolicyId=${loginPolicyId}`) as string[];
    }

    getLoginPolicyIdByUserId = async (userId: string) => {
        return await requests.get(`/${this.group}/login-policy-id?userId=${userId}`);
    }
}

const loginPolicyApi = new LoginPolicyApi();
export default loginPolicyApi;