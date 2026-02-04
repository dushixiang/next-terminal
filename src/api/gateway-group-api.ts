import {Api} from "./core/api";

export interface GatewayMember {
    gatewayType: string;
    gatewayId: string;
    priority: number;
    enabled: boolean;
}

export interface GatewayGroup {
    id: string;
    name: string;
    description: string;
    selectionMode: 'priority' | 'latency' | 'random';
    members: GatewayMember[];
    createdAt: number;
    updatedAt: number;
}

class GatewayGroupApi extends Api<GatewayGroup> {
    constructor() {
        super("admin/gateway-groups");
    }
}

const gatewayGroupApi = new GatewayGroupApi();
export default gatewayGroupApi;
