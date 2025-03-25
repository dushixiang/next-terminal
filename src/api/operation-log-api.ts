import {Api} from "./core/api";
import requests from "@/src/api/core/requests";
import {UserAgent} from "@/src/api/user-api";

export interface OperationLog {
    id: string;
    accountId: string;
    accountName: string;
    action: string;
    content: string;
    ip: string;
    region: string;
    userAgent: UserAgent;
    status: string;
    errorMessage: string;
    remark: string;
    createdAt: number;
}


class OperationLogApi extends Api<OperationLog> {
    constructor() {
        super("admin/operation-logs");
    }

    clear = async () => {
        await requests.post(`/${this.group}/clear`);
    }
}

let operationLogApi = new OperationLogApi();
export default operationLogApi;