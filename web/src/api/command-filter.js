import request from "../common/request";
import Api from "./api";

class CommandFilterApi extends Api{

    constructor() {
        super("command-filters");
    }

    Bind = async (id, data) => {
        const result = await request.post(`/${this.group}/${id}/bind`, data);
        return result['code'] === 1;
    }

    Unbind = async (id, data) => {
        const result = await request.post(`/${this.group}/${id}/unbind`, data);
        return result['code'] === 1;
    }

    GetAssetIdByCommandFilterId = async (commandFilterId) => {
        let result = await request.get(`/${this.group}/${commandFilterId}/assets/id`);
        if (result['code'] !== 1) {
            return [];
        }
        return result['data'];
    }

    GetAll = async () => {
        let result = await request.get(`/${this.group}`);
        if (result['code'] !== 1) {
            return [];
        }
        return result['data'];
    }
}

const commandFilterApi = new CommandFilterApi();
export default commandFilterApi;