import {Api} from "./core/api";
import requests from "@/src/api/core/requests";

export interface SSHGateway {
    id: string;
    type: string;
    name: string;
    ip: string;
    port: number;
    accountType: string;
    username: string;
    password: string;
    privateKey: string;
    passphrase: string;
    createdAt: number;
    status: string;
    statusMessage: string;
}

class SshGatewayApi extends Api<SSHGateway> {
    constructor() {
        super("admin/ssh-gateways");
    }

    decrypt = async (id: string, securityToken: string) => {
        return await requests.get(`/${this.group}/${id}/decrypted?securityToken=${securityToken}`) as SSHGateway;
    }
}

let sshGatewayApi = new SshGatewayApi();
export default sshGatewayApi;