import {Api} from "./core/api";
import requests from "./core/requests";
import {TreeDataNode} from "antd";
import type {GatewayHop} from "@/api/gateway-chain";

export interface AssetGroupNode extends TreeDataNode {
    gatewayChain?: GatewayHop[];
    children?: AssetGroupNode[];
}

export interface Asset {
    enabled: boolean;
    id: string;
    logo: string;
    name: string;
    alias?: string;
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
    connectionMode: 'direct' | 'gateway' | 'proxy';
    owner: string;
    gatewayChain: GatewayHop[];
    proxyId?: string;
    tags?: string[];
    attrs?: Record<string, any>;
    createdAt: number;
    lastAccessTime: number;
    groupId: string;
    sort: string;
    groupFullName: string;
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

export interface SortPositionRequest {
    id: string;        // 被拖拽的项 ID
    beforeId: string;  // 目标位置的前一项 ID (空字符串表示移到最前)
    afterId: string;   // 目标位置的后一项 ID (空字符串表示移到最后)
}

export type AICommandPolicy = '' | 'auto' | 'balanced' | 'always';

export interface BatchUpdateAssetRequest {
    assetIds: string[];
    changes: {
        terminal?: {
            restrictedShell?: boolean;
            enableAliveCheck?: boolean;
            enableDetectOS?: boolean;
            sftpDirectoryFollow?: boolean;
            connectTimeout?: number;
            backspaceMode?: 'del' | 'bs';
            env?: string;
        };
        ai?: {
            commandPolicy?: AICommandPolicy;
        };
        connection?: {
            connectionMode: Asset['connectionMode'];
            gatewayChain: GatewayHop[];
            proxyId?: string;
        };
    };
}

export interface BatchUpdateAssetResult {
    selectedCount: number;
    sshUpdatedCount: number;
    sshSkippedCount: number;
    connectionUpdatedCount: number;
}

class AssetApi extends Api<Asset> {
    updateEnabled = async (id: string, enabled: boolean) => {
        return await requests.patch<void>(`/${this.group}/${id}/enabled`, {enabled});
    }

    constructor() {
        super("admin/assets");
    }

    getAll = async (protocol?: string) => {
        const query = protocol ? `?protocol=${protocol}` : '';
        return await requests.get(`/${this.group}${query}`) as Asset[];
    }

    checking = async (keys: string[]) => {
        return await requests.post(`/${this.group}/checking`, keys) as CheckingResult[];
    }

    importAsset = async (file: any) => {
        const formData = new FormData();
        formData.append("file", file,);
        return await requests.postForm(`/${this.group}/import`, formData);
    }

    changeGroup = async (data: any) => {
        return await requests.post<void>(`/${this.group}/change-group`, data);
    }

    batchUpdate = async (data: BatchUpdateAssetRequest) => {
        return await requests.post(`/${this.group}/batch-update`, data) as BatchUpdateAssetResult;
    }

    getTags = async () => {
        return await requests.get(`/${this.group}/tags`) as string[]
    }

    getGroups = async () => {
        return await requests.get(`/${this.group}/groups`) as AssetGroupNode[]
    }

    setGroups = async (data: any) => {
        return await requests.put<void>(`/${this.group}/groups`, data);
    }

    deleteGroup = async (groupId: string) => {
        return await requests.delete<void>(`/${this.group}/groups/${groupId}`);
    }

    getLogos = async () => {
        return await requests.get(`/${this.group}/logos`) as Image[]
    }

    decrypt = async (id: string, securityToken: string) => {
        return await requests.get(`/${this.group}/${id}/decrypted`, {securityToken}) as Asset;
    }

    tree = async (protocol?: string) => {
        if (!protocol) {
            protocol = '';
        }
        return await requests.get(`/${this.group}/tree?protocol=${protocol}`) as TreeDataNode[];
    }

    updateSortPosition = async (req: SortPositionRequest) => {
        return await requests.post<void>(`/${this.group}/sort`, req);
    }

    updateBasic = async (id: string, data: Partial<Asset>) => {
        return await requests.patch<void>(`/${this.group}/${id}/basic`, data);
    }

    detectOS = async (id: string) => {
        return await requests.post<void>(`/${this.group}/${id}/detect-os`);
    }

    wol = async (id: string) => {
        return await requests.post(`/${this.group}/${id}/wol`);
    }
}

const assetApi = new AssetApi();
export default assetApi;
