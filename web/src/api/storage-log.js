import Api from "./api";
import request from "../common/request";

class StorageLogApi extends Api {
    constructor() {
        super("storage-logs");
    }

    create = () => {
    }
    getById = () => {
    }
    updateById = () => {
    }

    Clear = async () => {
        const result = await request.post(`/${this.group}/clear`);
        return result['code'] === 1;
    }
}

const storageLogApi = new StorageLogApi();
export default storageLogApi;