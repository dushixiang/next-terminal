import Api from "./api";

class StorageApi extends Api{
    constructor() {
        super("storages");
    }
}

let storageApi = new StorageApi();
export default storageApi;