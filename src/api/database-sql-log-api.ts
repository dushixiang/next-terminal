import qs from "qs";
import requests from "./core/requests";

export interface DatabaseSQLLog {
    id: string;
    assetId: string;
    assetName: string;
    database: string;
    userId: string;
    userName: string;
    clientIp: string;
    sql: string;
    durationMs: number;
    rowsAffected: number;
    status: string;
    errorMessage: string;
    blocked: boolean;
    source: string;
    createdAt: number;
}

class DatabaseSQLLogApi {
    group = "admin/database-sql-logs";

    paging = async (params: any) => {
        const paramsStr = qs.stringify(params);
        return await requests.get(`/${this.group}/paging?${paramsStr}`);
    }

    clear = async () => {
        await requests.post(`/${this.group}/clear`);
    }
}

const databaseSQLLogApi = new DatabaseSQLLogApi();
export default databaseSQLLogApi;
