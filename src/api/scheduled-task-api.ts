import {Api} from "./core/api";
import requests from "@/api/core/requests";
import qs from "qs";

export interface ScheduledTask {
    id: string;
    entryId: number;
    name: string;
    spec: string;
    type: string;
    assetIdList?: any;
    mode: string;
    script: string;
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface ScheduledTaskLog {
    id: string;
    jobId: string;
    jobType: string;
    results: [];
    createdAt: number;
}

export interface CheckStatusResult {
    name: string
    active: boolean
    usedTime: number
    usedTimeStr: string
    error: string
}

export interface ExecScriptResult {
    name: string
    success: boolean
    usedTime: number
    usedTimeStr: string
    result: string
}

export interface RenewCertificateResult {
    name: string
    success: boolean
    error?: string
}

class ScheduledTaskApi extends Api<ScheduledTask> {
    constructor() {
        super("admin/scheduled-tasks");
    }

    changeStatus = async (id: string, enabled: boolean) => {
        return await requests.post(`/${this.group}/${id}/change-status?enabled=${enabled}`);
    }

    exec = async (id: string) => {
        await requests.post(`/${this.group}/${id}/exec`)
    }

    getLogPaging = async (jobId: string, params: any) => {
        let paramsStr = qs.stringify(params);
        return await requests.get(`/${this.group}/${jobId}/logs/paging?${paramsStr}`);
    }

    clearLog = async (jobId: string) => {
        await requests.delete(`/${this.group}/${jobId}/logs`);
    }

    getNextTenRuns = async (spec: string) => {
        return await requests.post(`/${this.group}/next-ten-runs`, {
            'spec': spec
        }) as string[];
    }
}

let scheduledTaskApi = new ScheduledTaskApi();
export default scheduledTaskApi;