import requests from "./core/requests";
import {TreeDataNode} from "antd";
import {Strategy} from "@/src/api/strategy-api";
import {SessionSharer, SessionWatermark} from "@/src/api/session-api";

export interface ExportSession {
    id: string;
    protocol: string
    assetName: string
    strategy: Strategy;
    url: string;
    watermark: SessionWatermark;
    readonly: boolean;
    idle: number
    fileSystem: boolean
    width: number;
    height: number;
}

export interface AssetUser {
    id: string;
    logo: string;
    name: string;
    address: string;
    protocol: string;
    tags: string[];
    description: string;
    status: string;
    statusText: string;
    users: string[];
}

export interface Stats {
    info: Info;
    load: Load;
    memory: Memory;
    fileSystems: FileSystem[];
    network: Network[];
    cpu: CPUUsage[];
}

interface Memory {
    memTotal: number;
    memAvailable: number;
    memFree: number;
    memBuffers: number;
    memCached: number;
    memUsed: number;
    swapTotal: number;
    swapFree: number;
}

interface Load {
    load1: string;
    load5: string;
    load15: string;
    runningProcess: string;
    totalProcess: string;
}

interface Info {
    id: string;
    name: string;
    version: string;
    arch: string;
    uptime: number;
    hostname: string;
    upDays: number;
}

export interface CPUUsage {
    user: number;
    nice: number;
    system: number;
}

export interface Network {
    iface: string;
    ipv4: string;
    ipv6: string;
    rx: number;
    tx: number;
    rxSec: number;
    txSec: number;
}

export interface FileSystem {
    mountPoint: string;
    used: number;
    free: number;
    total: number;
    percent: number;
}

export interface TreeDataNodeWithExtra {
    key: string;
    title: string;
    children?: any;
    isLeaf: boolean;
    extra?: Extra;
}

interface Extra {
    protocol: string;
    logo: string;
    status: string;
    network: string;
}

class PortalApi {
    group = "portal";

    assets = async () => {
        return await requests.get(`/${this.group}/assets`) as AssetUser[];
    }

    getAssetsTree = async (protocol?: string, keyword?: string) => {
        if (!protocol) {
            protocol = '';
        }
        if (!keyword) {
            keyword = '';
        }
        return await requests.get(`/${this.group}/assets/tree?protocol=${protocol}&keyword=${keyword}`) as TreeDataNodeWithExtra[];
    }

    getAccessRequireMFA = async () => {
        let data = await requests.get(`/${this.group}/access-require-mfa`);
        return data['required'] as boolean;
    }

    createSessionByAssetsId = async (assetId: string, securityToken?: string) => {
        if(!securityToken) {
            securityToken = '';
        }
        return await requests.post(`/${this.group}/sessions?securityToken=${securityToken}`, {"assetId": assetId}) as ExportSession;
    }

    getSessionById = async (sessionId: string) => {
        return await requests.get(`/${this.group}/sessions/${sessionId}`) as ExportSession;
    }

    stats = async (sessionId: string) => {
        return await requests.get(`/access/terminal/${sessionId}/stats`) as Stats;
    }

    getShare = async (sessionId: string) => {
        return await requests.get(`/${this.group}/sessions/${sessionId}/share`) as SessionSharer;
    }

    createShare = async (sessionId: string, passcode: string) => {
        return await requests.post(`/${this.group}/sessions/${sessionId}/share`, {passcode}) as SessionSharer;
    }

    cancelShare = async (sessionId: string) => {
        await requests.delete(`/${this.group}/sessions/${sessionId}/share`);
    }

    accessWebsite = async (id: string) => {
        const data = await requests.get(`/${this.group}/website/access?websiteId=${id}`);
        return data['url'] as string;
    }
}

let portalApi = new PortalApi();
export default portalApi;