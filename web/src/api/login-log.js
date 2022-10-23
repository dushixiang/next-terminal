import Api from "./api";
import request from "../common/request";

class LoginLogApi extends Api{
    constructor() {
        super("login-logs");
    }

    Clear = async () => {
        const result = await request.post(`/${this.group}/clear`);
        return result['code'] === 1;
    }
}

let loginLogApi = new LoginLogApi();
export default loginLogApi;