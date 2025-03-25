import {Api} from "./core/api";
import requests from "@/src/api/core/requests";

export interface AgentGateway {
    id: string;
    name: string;
    ip: string;
    os: string;
    arch: string;
    status: string;
    statusMessage: string;
    createdAt: number;
    updatedAt: number;
}

export interface RegisterParam {
    endpoint: string;
    token: string;
    tls: boolean;
    download: string;
}

class AgentGatewayApi extends Api<AgentGateway> {
    constructor() {
        super("admin/agent-gateways");
    }

    getRegisterParam = async () => {
        return await requests.get(`/${this.group}/get-register-param`) as RegisterParam;
    }

    setRegisterAddr = async (endpoint: string, download: string) => {
        return await requests.post(`/${this.group}/set-register-addr?endpoint=${endpoint}&download=${download}`);
    }
}

let agentGatewayApi = new AgentGatewayApi();
export default agentGatewayApi;