import Api from "./api";

class AccessGatewayApi extends Api{
    constructor() {
        super("access-gateways");
    }
}

let accessGatewayApi = new AccessGatewayApi();
export default accessGatewayApi;