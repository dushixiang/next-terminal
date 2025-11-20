import {Api} from "@/api/core/api";

export interface Strategy {
    id: string;
    name: string;
    upload: boolean;
    download: boolean;
    delete: boolean;
    rename: boolean;
    edit: boolean;
    copy: boolean;
    paste: boolean;
    createDir: boolean;
    createFile: boolean;
}

class StrategyApi extends Api<Strategy> {
    constructor() {
        super("admin/strategies");
    }
}

const strategyApi = new StrategyApi();
export default strategyApi;