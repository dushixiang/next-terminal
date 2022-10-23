import Api from "./api";

class SecurityApi extends Api {
    constructor() {
        super("securities");
    }
}

let securityApi = new SecurityApi();
export default securityApi;