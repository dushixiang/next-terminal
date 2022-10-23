import request from "../common/request";
import Api from "./api";

class RoleApi extends Api {
    constructor() {
        super("roles");
    }

    GetAll = async () => {
        let result = await request.get(`/${this.group}`);
        if (result['code'] !== 1) {
            return [];
        }
        return result['data'];
    }
}

let roleApi = new RoleApi();
export default roleApi;