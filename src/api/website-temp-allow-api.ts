import requests from "@/api/core/requests";

export interface WebsiteTempAllowEntry {
    websiteId: string;
    ip: string;
    expiresAt: number;
    remainingSeconds: number;
}

class WebsiteTempAllowApi {
    list = async (websiteId: string) => {
        return await requests.get(`/admin/website-temp-allow?websiteId=${websiteId}`) as WebsiteTempAllowEntry[];
    }

    remove = async (websiteId: string, ip: string) => {
        return await requests.delete(`/admin/website-temp-allow?websiteId=${websiteId}&ip=${encodeURIComponent(ip)}`);
    }
}

const websiteTempAllowApi = new WebsiteTempAllowApi();
export default websiteTempAllowApi;
