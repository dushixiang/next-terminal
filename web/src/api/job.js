import Api from "./api";
import request from "../common/request";
import qs from "qs";

class JobApi extends Api {
    constructor() {
        super("jobs");
    }

    changeStatus = async (id, status) => {
        let result = await request.post(`/${this.group}/${id}/change-status?status=${status}`);
        return result['code'] !== 1;
    }

    exec = async (id) => {
        let result = await request.post(`/${this.group}/${id}/exec`);
        return result['code'] !== 1;
    }

    getLogPaging = async (id, params) => {
        let paramsStr = qs.stringify(params);
        let result = await request.get(`/${this.group}/${id}/logs/paging?${paramsStr}`);
        if (result['code'] !== 1) {
            return {};
        }
        return result['data'];
    }

    deleteLogByJobId = async (id) => {
        let result = await request.delete(`/${this.group}/${id}/logs`);
        return result['code'] !== 1;
    }
}

let jobApi = new JobApi();
export default jobApi;