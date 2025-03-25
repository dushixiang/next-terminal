import requests from "@/src/api/core/requests";

export interface TimeCounter {
    loginFailedTimes: number;
    sessionOnlineCount: number;
    sessionTotalCount: number;
    userOnlineCount: number;
    userTotalCount: number;
    assetActiveCount: number;
    assetTotalCount: number;
    websiteActiveCount: number;
    websiteTotalCount: number;
    gatewayActiveCount: number;
    gatewayTotalCount: number;
}

export interface TypeValue {
    type: string;
    value: number;
}

class DashboardApi {

    getTimeCounter = async () => {
        return await requests.get(`/admin/dashboard/time-counter`) as TimeCounter;
    }

    getDateCounter = async () => {
        return await requests.get(`/admin/dashboard/date-counter`);
    }

    getDateCounterV2 = async () => {
        return await requests.get(`/admin/dashboard/v2/date-counter`);
    }

    getAssetTypes = async () => {
        return await requests.get(`/admin/dashboard/asset-types`) as TypeValue[];
    }
}

let dashboardApi = new DashboardApi();
export default dashboardApi;