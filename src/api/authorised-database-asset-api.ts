import qs from "qs";
import requests from "./core/requests";

export interface AuthorisedDatabaseAsset {
    id: string;
    assetId: string;
    assetName: string;
    userId: string;
    userName: string;
    departmentId: string;
    departmentName: string;
    expiredAt: number;
    createdAt: number;
}

class AuthorisedDatabaseAssetApi {
    group = "admin/authorised-database-assets";

    paging = async (params: any) => {
        const paramsStr = qs.stringify(params);
        return await requests.get(`/${this.group}/paging?${paramsStr}`);
    }

    selected = async (expect: string, userId?: string, departmentId?: string, assetId?: string) => {
        const paramsStr = qs.stringify({expect, userId, departmentId, assetId});
        return await requests.get(`/${this.group}/selected?${paramsStr}`) as string[];
    }

    deleteById = async (id: string) => {
        await requests.delete(`/${this.group}/${id}`);
    }

    getById = async (id: string) => {
        return await requests.get(`/${this.group}/${id}`);
    }

    update = async (id: string, values: any) => {
        await requests.put(`/${this.group}/${id}`, values);
    }

    post = async (values: any) => {
        await requests.post(`/${this.group}`, values);
    }
}

const authorisedDatabaseAssetApi = new AuthorisedDatabaseAssetApi();
export default authorisedDatabaseAssetApi;
