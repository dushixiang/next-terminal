import Api from "../api";
import request from "../../common/request";

class WorkAssetApi extends Api{
    constructor() {
        super("worker/assets");
    }

    tags = async () => {
        let result = await request.get(`/${this.group}/tags`);
        if (result['code'] !== 1) {
            return [];
        }
        return result['data'];
    }
}

let workAssetApi = new WorkAssetApi();
export default workAssetApi;