import {Api} from "./core/api";
import requests from "./core/requests";
import type {GatewayHop} from "@/api/gateway-chain";

export interface DatabaseAsset {
    enabled: boolean;
    id: string;
    name: string;
    type: string;
    host: string;
    port: number;
    database?: string;
    username: string;
    password: string;
    description: string;
    status: string;
    statusText: string;
    connectionMode: 'direct' | 'gateway' | 'proxy';
    gatewayChain: GatewayHop[];
    proxyId?: string;
    tags?: string[];
    attrs?: any;
    createdAt: number;
    updatedAt: number;
    sort: string;
}

class DatabaseAssetApi extends Api<DatabaseAsset> {
    updateEnabled = async (id: string, enabled: boolean) => {
        return await requests.patch<void>(`/${this.group}/${id}/enabled`, {enabled});
    }

    constructor() {
        super("admin/database-assets");
    }

    decrypt = async (id: string, securityToken?: string) => {
        return await requests.get(`/${this.group}/${id}/decrypted`, {securityToken}) as DatabaseAsset;
    }

    getAll = async (type?: string) => {
        const query = type ? `?type=${encodeURIComponent(type)}` : '';
        return await requests.get(`/${this.group}${query}`) as DatabaseAsset[];
    }

    test = async (values: Partial<DatabaseAsset>) => {
        return await requests.post<void>(`/${this.group}/test`, values);
    }
}

const databaseAssetApi = new DatabaseAssetApi();
export default databaseAssetApi;
