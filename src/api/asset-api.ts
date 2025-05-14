import {Api} from "./core/api";
import requests from "./core/requests";
import {TreeDataNode} from "antd";

export interface Asset {
    id: string;
    logo: string;
    name: string;
    protocol: string;
    ip: string;
    port: number;
    accountType: string;
    username: string;
    password: string;
    credentialId: string;
    privateKey: string;
    passphrase: string;
    description: string;
    status: string;
    statusText: string;
    owner: string;
    accessGatewayId: string;
    tags?: string[];
    attrs?: any;
    createdAt: number;
    lastAccessTime: number;
    groupId: string;
}

export interface CheckingResult {
    name: string;
    active: boolean;
    error: string;
    usedTime: number;
    usedTimeStr: string;
}

export interface Image {
    name: string;
    data: string;
}

class AssetApi extends Api<Asset> {
    constructor() {
        super("admin/assets");
    }

    checking = async (keys: string[]) => {
        return await requests.post(`/${this.group}/checking`, keys) as CheckingResult[];
    }

    importAsset = async (file: any) => {
        const formData = new FormData();
        formData.append("file", file,);
        return await requests.postForm(`/${this.group}/import`, formData);
    }

    changeOwner = async (data: any) => {
        return await requests.post(`/${this.group}/change-owner`, data);
    }

    changeGroup = async (data: any) => {
        return await requests.post(`/${this.group}/change-group`, data);
    }

    getTags = async () => {
        return await requests.get(`/${this.group}/tags`) as string[]
    }

    getGroups = async () => {
        return await requests.get(`/${this.group}/groups`) as TreeDataNode[]
    }

    setGroups = async (data: any) => {
        return await requests.put(`/${this.group}/groups`, data);
    }

    deleteGroup = async (groupId: string) => {
        return await requests.delete(`/${this.group}/groups/${groupId}`);
    }

    getLogos = async () => {
        return await requests.get(`/${this.group}/logos`) as Image[]
    }

    up = async (id: string) => {
        await requests.post(`/${this.group}/${id}/up`);
    }

    down = async (id: string) => {
        await requests.post(`/${this.group}/${id}/down`);
    }

    decrypt = async (id: string, securityToken: string) => {
        return await requests.get(`/${this.group}/${id}/decrypted?securityToken=${securityToken}`) as Asset;
    }

    tree = async (protocol?: string) => {
        if (!protocol) {
            protocol = '';
        }
        return await requests.get(`/${this.group}/tree?protocol=${protocol}`) as TreeDataNode[];
    }
}

const assetApi = new AssetApi();
export default assetApi;