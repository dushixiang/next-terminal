import {Api} from "./core/api";
import requests from "@/src/api/core/requests";

export interface Storage {
    id: string;
    name: string;
    isShare: boolean;
    limitSize: number;
    isDefault: boolean;
    createdBy: string;
    createdAt: number;
    usedSize: number;
}

class StorageApi extends Api<Storage> {
    constructor() {
        super("admin/storages");
    }

    getShares = async () => {
        return await requests.get(`/${this.group}/shares`) as Storage[];
    }
}

let storageApi = new StorageApi();
export default storageApi;