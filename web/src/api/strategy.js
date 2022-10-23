import Api from "./api";
import request from "../common/request";

class StrategyApi extends Api {
    constructor() {
        super("strategies");
    }

    GetAll = async () => {
        let result = await request.get(`/${this.group}`);
        if (result['code'] !== 1) {
            return [];
        }
        return result['data'];
    }
}

const strategyApi = new StrategyApi();
export default strategyApi;