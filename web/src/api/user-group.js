import Api from "./api";
import request from "../common/request";

class UserGroupApi extends Api {
    constructor() {
        super("user-groups");
    }

    GetAll = async () => {
        let result = await request.get(`/${this.group}`);
        if (result['code'] !== 1) {
            return [];
        }
        return result['data'];
    }
}

const userGroupApi = new UserGroupApi();
export default userGroupApi;