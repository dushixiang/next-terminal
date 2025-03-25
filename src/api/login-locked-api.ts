import {Api} from "./core/api";

export interface LoginLocked {
    id: string
    type: string
}

class LoginLockedApi extends Api<LoginLocked> {
    constructor() {
        super("admin/login-locked");
    }
}

let loginLockedApi = new LoginLockedApi();
export default loginLockedApi;