import Api from "./api";
import request from "../common/request";

class CommandApi extends Api{
    constructor() {
        super("commands");
    }

    changeOwner = async (id, owner) => {
        let result = await request.post(`/${this.group}/${id}/change-owner?owner=${owner}`);
        return result['code'] === 1;
    }
}

let commandApi = new CommandApi();
export default commandApi;