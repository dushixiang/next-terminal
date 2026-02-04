import qs from "qs";
import requests from "./core/requests";

export interface DatabaseWorkOrder {
    id: string;
    assetId: string;
    assetName: string;
    database: string;
    sql: string;
    requestReason: string;
    requesterId: string;
    requesterName: string;
    approverId: string;
    approverName: string;
    executorId: string;
    executorName: string;
    status: string;
    reason: string;
    rowsAffected: number;
    errorMessage: string;
    createdAt: number;
    approvedAt: number;
    executedAt: number;
}

export interface CreateDatabaseWorkOrderRequest {
    assetId: string;
    sql: string;
    requestReason: string;
}

class DbWorkOrderApi {
    group = "db-work-orders";

    paging = async (params: any) => {
        const paramsStr = qs.stringify(params);
        return await requests.get(`/${this.group}/paging?${paramsStr}`);
    }

    getById = async (id: string) => {
        return await requests.get(`/${this.group}/${id}`) as DatabaseWorkOrder;
    }

    create = async (values: CreateDatabaseWorkOrderRequest) => {
        return await requests.post(`/${this.group}`, values) as DatabaseWorkOrder;
    }
}

class DbWorkOrderAdminApi {
    group = "admin/db-work-orders";

    paging = async (params: any) => {
        const paramsStr = qs.stringify(params);
        return await requests.get(`/${this.group}/paging?${paramsStr}`);
    }

    getById = async (id: string) => {
        return await requests.get(`/${this.group}/${id}`) as DatabaseWorkOrder;
    }

    approve = async (id: string) => {
        await requests.post(`/${this.group}/${id}/approve`);
    }

    reject = async (id: string, reason: string) => {
        await requests.post(`/${this.group}/${id}/reject`, {reason});
    }

    deleteById = async (id: string) => {
        await requests.delete(`/${this.group}/${id}`);
    }
}

export const dbWorkOrderApi = new DbWorkOrderApi();
export const dbWorkOrderAdminApi = new DbWorkOrderAdminApi();
