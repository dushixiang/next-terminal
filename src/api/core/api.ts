import requests from "./requests";
import qs from "qs";

export class PageParam extends Map {
    public pageIndex: number | undefined;
    public pageSize: number | undefined;

    constructor(pageIndex: number, pageSize: number) {
        super();
        this.pageIndex = pageIndex;
        this.pageSize = pageSize
    }
}

export type PageData<T> = {
    items: T[],
    total: number,
}

export class Api<T> {
    group = "";

    constructor(group: string) {
        this.group = group;
    }

    getById = async (id: string) => {
        let result = await requests.get(`/${this.group}/${id}`);
        return result as T;
    }

    getPaging = async (params: {}) => {
        let paramsStr = qs.stringify(params);
        let result = await requests.get(`/${this.group}/paging?${paramsStr}`);
        return result as PageData<T>;
    }

    getAll = async () => {
        let result = await requests.get(`/${this.group}`);
        return result as T[];
    }

    create = async (data: T) => {
        const result = await requests.post(`/${this.group}`, data);
        return result as T;
    }

    updateById = async (id: string, data: T) => {
        await requests.put(`/${this.group}/${id}`, data);
    }

    deleteById = async (id: string) => {
        await requests.delete(`/${this.group}/${id}`);
    }
}