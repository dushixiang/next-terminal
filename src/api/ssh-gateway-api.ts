import {Api} from "./core/api";
import requests from "@/api/core/requests";

export interface SSHGateway {
    id: string;
    type: string;
    name: string;
    configMode: string; // 配置模式：direct/credential/asset
    ip: string;
    port: number;
    accountType: string;
    username: string;
    password: string;
    privateKey: string;
    passphrase: string;
    credentialId: string; // 引用的凭据ID
    assetId: string; // 引用的资产ID
    createdAt: number;
    status: string;
    statusMessage: string;
}

export interface AssetForGatewayOption {
    id: string;
    name: string;
    ip: string;
    port: number;
    canBeGateway: boolean;
    disableReason?: string;
}

class SshGatewayApi extends Api<SSHGateway> {
    constructor() {
        super("admin/ssh-gateways");
    }

    decrypt = async (id: string, securityToken: string) => {
        return await requests.get(`/${this.group}/${id}/decrypted?securityToken=${securityToken}`) as SSHGateway;
    }

    // 获取可作为网关的 SSH 资产列表
    getAvailableAssets = async () => {
        return await requests.get(`/admin/assets/ssh/available-for-gateway`) as AssetForGatewayOption[];
    }
}

let sshGatewayApi = new SshGatewayApi();
export default sshGatewayApi;