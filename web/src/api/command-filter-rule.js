import Api from "./api";

class CommandFilterRuleApi extends Api{
    constructor() {
        super("command-filter-rules");
    }
}

const commandFilterRuleApi = new CommandFilterRuleApi();
export default commandFilterRuleApi;