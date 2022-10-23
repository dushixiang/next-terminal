import request from "../common/request";
import qs from "qs";

export default class Api {
    group = "";

    constructor(group) {
        this.group = group;
    }

    getById = async (id) => {
        let result = await request.get(`/${this.group}/${id}`);
        if (result['code'] !== 1) {
            return;
        }
        return result['data'];
    }

    getPaging = async (params) => {
        let paramsStr = qs.stringify(params);
        let result = await request.get(`/${this.group}/paging?${paramsStr}`);
        if (result['code'] !== 1) {
            return {};
        }
        return result['data'];
    }

    getAll = async () => {
        let result = await request.get(`/${this.group}`);
        if (result['code'] !== 1) {
            return [];
        }
        return result['data'];
    }

    create = async (data) => {
        const result = await request.post(`/${this.group}`, data);
        return result['code'] === 1;
    }

    updateById = async (id, data) => {
        const result = await request.put(`/${this.group}/${id}`, data);
        return result['code'] === 1;
    }

    deleteById = async (id) => {
        const result = await request.delete(`/${this.group}/${id}`);
        return result['code'] === 1;
    }
}