import requests from "./core/requests";

export interface License {
    type: string;
    machineId: string;
    asset: number;
    database?: number;
    concurrent: number;
    user: number;
    expired: number;
}

// 定义 License 类
export class SimpleLicense {
    type: string | '' | 'free' | 'test' | 'premium' | 'enterprise';
    expired?: number;
    oem?: boolean;

    constructor(type: string, expired?: number, oem?: boolean) {
        this.type = type;
        this.expired = expired;
        this.oem = oem;
    }

    // 添加方法
    isPremium(): boolean {
        return this.type === 'premium';
    }

    isEnterprise(): boolean {
        return this.type === 'enterprise';
    }

    isTest(): boolean {
        return this.type === 'test';
    }

    isFree(): boolean {
        return this.type === '' || this.type === 'free';
    }

    isExpired(): boolean {
        return this.expired !== undefined && this.expired > 0 && this.expired < new Date().getTime();
    }

    isOEM(): boolean {
        return this.oem === true;
    }
}

class LicenseApi {

    group = "/admin/license";

    getMachineId = async () => {
        return await requests.get(`${this.group}/machine-id`);
    }

    getLicense = async () => {
        return await requests.get(`${this.group}`) as License;
    }

    getSimpleLicense = async () => {
        let data = await requests.get(`/license?noerr`);
        return new SimpleLicense(data.type, data.expired, data.oem);
    }

    setLicense = async (values: any) => {
        await requests.post(`${this.group}`, values);
    }

    requestLicense = async () => {
        await requests.post(`${this.group}/request`);
    }
}

let licenseApi = new LicenseApi();
export default licenseApi;
