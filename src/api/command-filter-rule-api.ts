import {Api} from "@/src/api/core/api";

export interface CommandFilterRule {
    id: string;
    commandFilterId: string;
    type: string;
    command: string;
    priority: number;
    enabled: boolean;
    action: string;
}

class CommandFilterRuleApi extends Api<CommandFilterRule>{
    constructor() {
        super("admin/command-filter-rules");
    }
}

const commandFilterRuleApi = new CommandFilterRuleApi();
export default commandFilterRuleApi;