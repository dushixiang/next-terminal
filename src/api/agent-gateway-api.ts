import {Api} from "./core/api";
import requests from "@/src/api/core/requests";

export interface AgentGateway {
    id: string;
    name: string;
    ip: string;
    os: string;
    arch: string;
    online: boolean;
    createdAt: number;
    updatedAt: number;
    sortOrder: number;
    stat?: Stat;
    version: string;
}

interface Stat {
    ping: number;
    cpu: CPU;
    memory: Memory;
    disk: Disk;
    disk_io: DiskIO;
    network: Network;
    load: Load;
    host: Host;
    process: Process;
    connections: any;
    tcp_states: any[];
    security_alerts?: any;
    errors: Errors;
}

interface Errors {
}

interface Process {
    total: number;
}

interface Host {
    hostname: string;
    os: string;
    arch: string;
    version: string;
    uptime: number;
}

interface Load {
    load_1: number;
    load_5: number;
    load_15: number;
}

interface Network {
    rx: number;
    tx: number;
    rx_sec: number;
    tx_sec: number;
    history: any[];

    external_ip: string;
    internal_ips: string[];
}

interface DiskIO {
    read_bytes: number;
    write_bytes: number;
    history: any[];
}

interface Disk {
    total: number;
    used: number;
    percent: number;
    history: any[];
}

interface Memory {
    total: number;
    used: number;
    free: number;
    percent: number;
    swap_total: number;
    swap_free: number;
    history: any[];
}

interface CPU {
    model: string;
    physical_cores: number;
    logical_cores: number;
    percent: number;
    history: any[];
}

export interface RegisterParam {
    endpoint: string;
    token: string;
}

export interface SortItem {
    id: string;
    sortOrder: number;
}

class AgentGatewayApi extends Api<AgentGateway> {
    constructor() {
        super("admin/agent-gateways");
    }

    getRegisterParam = async () => {
        return await requests.get(`/${this.group}/get-register-param`) as RegisterParam;
    }

    setRegisterAddr = async (endpoint: string) => {
        return await requests.post(`/${this.group}/set-register-addr?endpoint=${endpoint}`);
    }

    getStat = async (id: string) => {
        return await requests.get(`/${this.group}/${id}/stat`) as Stat;
    }

    updateSort = async (items: SortItem[]) => {
        return await requests.post(`/${this.group}/sort`, items);
    }
}

let agentGatewayApi = new AgentGatewayApi();
export default agentGatewayApi;