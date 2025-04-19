import {Api} from "./core/api";

export interface AgentGatewayToken {
    id: string;
    remark: string;
    updatedAt: number;
}

class AgentGatewayTokenApi extends Api<AgentGatewayToken> {
    constructor() {
        super("admin/agent-gateway-tokens");
    }
}

let agentGatewayTokenApi = new AgentGatewayTokenApi();
export default agentGatewayTokenApi;