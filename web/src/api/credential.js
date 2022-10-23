import Api from "./api";
import request from "../common/request";

class CredentialApi extends Api{
    constructor() {
        super("credentials");
    }

    getAll = async () => {
        let result = await request.get(`/${this.group}`);
        if (result['code'] !== 1) {
            return [];
        }
        return result['data'];
    }
}

let credentialApi = new CredentialApi();
export default credentialApi;