import {Api} from "./core/api";
import requests from "@/src/api/core/requests";
import {LoginLog} from "@/src/api/user-api";

class LoginLogApi extends Api<LoginLog> {
    constructor() {
        super("admin/login-logs");
    }

    clear = async () => {
        await requests.post(`/${this.group}/clear`);
    }
}

let loginLogApi = new LoginLogApi();
export default loginLogApi;