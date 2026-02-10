import {Api} from "./core/api";
import requests from "./core/requests";

export interface DatabaseAsset {
    id: string;
    name: string;
    type: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    description: string;
    status: string;
    statusText: string;
    gatewayType: string;
    gatewayId: string;
    tags?: string[];
    attrs?: any;
    createdAt: number;
    updatedAt: number;
    sort: string;
}

class DatabaseAssetApi extends Api<DatabaseAsset> {
    constructor() {
        super("admin/database-assets");
    }

    decrypt = async (id: string, securityToken?: string) => {
        const query = securityToken ? `?securityToken=${encodeURIComponent(securityToken)}` : '';
        return await requests.get(`/${this.group}/${id}/decrypted${query}`) as DatabaseAsset;
    }

    getAll = async (type?: string) => {
        const query = type ? `?type=${encodeURIComponent(type)}` : '';
        return await requests.get(`/${this.group}${query}`) as DatabaseAsset[];
    }
}

const databaseAssetApi = new DatabaseAssetApi();
export default databaseAssetApi;
