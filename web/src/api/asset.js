import Api from "./api";
import request from "../common/request";

class AssetApi extends Api {
    constructor() {
        super("assets");
    }

    GetAll = async (protocol = '') => {
        let result = await request.get(`/${this.group}?protocol=${protocol}`);
        if (result['code'] !== 1) {
            return [];
        }
        return result['data'];
    }

    connTest = async (id) => {
        let result = await request.post(`/${this.group}/${id}/tcping`);
        if (result.code !== 1) {
            return [false, result.message];
        }
        return [result['data']['active'], result['data']['message']];
    }

    importAsset = async (file) => {
        const formData = new FormData();
        formData.append("file", file,);
        let result = await request.post(`/${this.group}/import`, formData, {'Content-Type': 'multipart/form-data'});
        if (result.code !== 1) {
            return [false, result.message];
        }
        return [true, result['data']];
    }

    changeOwner = async (id, owner) => {
        let result = await request.post(`/${this.group}/${id}/change-owner?owner=${owner}`);
        return result['code'] === 1;
    }
}

const assetApi = new AssetApi();
export default assetApi;