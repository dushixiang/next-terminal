import qs from "qs";
import requests from "./core/requests";

export interface Authorised {
    id: string;
    assetId: string;
    assetName: string;
    commandFilterId: string;
    commandFilterName: string;
    strategyId: string;
    strategyName: string;
    userId: string;
    userName: string;
    userGroupId: string;
    userGroupName: string;
    expiredAt: number;
    createdAt: number;
    assetGroupName: string;
}

class AuthorisedAssetApi {

    group = "admin/authorised-asset";

    paging = async (params: any) => {
        let paramsStr = qs.stringify(params);
        return await requests.get(`/${this.group}/paging?${paramsStr}`);
    }

    authorisedAssets = async (data: any) => {
        return await requests.post(`/${this.group}/assets`, data);
    }

    authorisedUsers = async (data: any) => {
        return await requests.post(`/${this.group}/users`, data);
    }

    authorisedDepartments = async (data: any) => {
        return await requests.post(`/${this.group}/departments`, data);
    }

    selected = async (expect: string, userId?: string, userGroupId?: string, assetId?: string) => {
        let paramsStr = qs.stringify({expect, userId, userGroupId, assetId});
        return await requests.get(`/${this.group}/selected?${paramsStr}`) as String[];
    }

    deleteById = async (id: string) => {
        await requests.delete(`/${this.group}/${id}`)
    }

    getById = async (id: string) => {
        return await requests.get(`/${this.group}/${id}`)
    }

    update = async (id: string, values: any) => {
        await requests.put(`/${this.group}/${id}`, values)
    }

    post = async (values: any) => {
        await requests.post(`/${this.group}`, values)
    }
}

const authorisedAssetApi = new AuthorisedAssetApi();
export default authorisedAssetApi;