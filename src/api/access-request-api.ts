import qs from "qs";
import requests from "./core/requests";

export type AccessRequestResourceType = 'asset' | 'database' | 'website';

export interface AccessRequest {
    id: string;
    requestNo: string;
    resourceType: AccessRequestResourceType;
    resourceId: string;
    resourceName: string;
    requesterId: string;
    requesterName: string;
    approverId: string;
    approverName: string;
    status: string;
    requestReason: string;
    /** 系统关闭时为原因码，其他情况为审批人输入的原文。 */
    reason: string;
    durationMinutes: number;
    requestedStartAt: number;
    startAt: number;
    approvedDurationMinutes: number;
    authorisedId: string;
    commandFilterId: string;
    strategyId: string;
    createdAt: number;
    approvedAt: number;
    expiredAt: number;
    cancelledAt: number;
}

export interface RequestableResource {
    resourceType: AccessRequestResourceType;
    resourceId: string;
    resourceName: string;
    groupName: string;
    authorised: boolean;
}

export interface CreateAccessRequestRequest {
    resourceType: AccessRequestResourceType;
    resourceId: string;
    requestReason: string;
    durationMinutes: number;
    startAt?: number;
}

export interface AccessRequestScope {
    departmentId: string;
    assetGroupIds: string[];
    websiteGroupIds: string[];
    databaseAssetIds: string[];
}


export interface ApproveAccessRequestRequest {
    startAt?: number;
    durationMinutes?: number;
    commandFilterId?: string;
    strategyId?: string;
    reason?: string;
}

class AccessRequestApi {
    group = "access-requests";

    paging = async (params: any) => {
        const paramsStr = qs.stringify(params);
        return await requests.get(`/${this.group}/paging?${paramsStr}`);
    }

    resources = async (resourceType?: AccessRequestResourceType) => {
        const paramsStr = qs.stringify({resourceType});
        return await requests.get(`/${this.group}/resources?${paramsStr}`) as RequestableResource[];
    }

    getById = async (id: string) => {
        return await requests.get(`/${this.group}/${id}`) as AccessRequest;
    }

    create = async (values: CreateAccessRequestRequest) => {
        return await requests.post(`/${this.group}`, values) as AccessRequest;
    }

    cancel = async (id: string) => {
        await requests.post(`/${this.group}/${id}/cancel`);
    }
}

class AccessRequestAdminApi {
    group = "admin/access-requests";

    scopes = async () => await requests.get(`/${this.group}/scopes`) as AccessRequestScope[];

    setScope = async (scope: AccessRequestScope) =>
        await requests.put(`/${this.group}/scopes/${scope.departmentId}`, scope);

    deleteScope = async (departmentId: string) =>
        await requests.delete(`/${this.group}/scopes/${departmentId}`);

    paging = async (params: any) => {
        const paramsStr = qs.stringify(params);
        return await requests.get(`/${this.group}/paging?${paramsStr}`);
    }

    getById = async (id: string) => {
        return await requests.get(`/${this.group}/${id}`) as AccessRequest;
    }

    approve = async (id: string, values: ApproveAccessRequestRequest) => {
        await requests.post(`/${this.group}/${id}/approve`, values);
    }

    reject = async (id: string, reason: string) => {
        await requests.post(`/${this.group}/${id}/reject`, {reason});
    }

    cancel = async (id: string) => {
        await requests.post(`/${this.group}/${id}/cancel`);
    }

    deleteById = async (id: string) => {
        await requests.delete(`/${this.group}/${id}`);
    }
}

export const accessRequestApi = new AccessRequestApi();
export const accessRequestAdminApi = new AccessRequestAdminApi();
