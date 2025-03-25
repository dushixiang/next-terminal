import {Api} from "./core/api";
import requests from "./core/requests";

export interface UserGroup {
    id: string
    name: string
    members: string[] | null
    createdAt: number
}

class UserGroupApi extends Api<UserGroup> {
    constructor() {
        super("admin/user-groups");
    }

    GetAll = async () => {
        return await requests.get(`/${this.group}`);
    }
}

const userGroupApi = new UserGroupApi();
export default userGroupApi;