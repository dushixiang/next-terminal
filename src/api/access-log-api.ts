import {Api} from "@/src/api/core/api";
import requests from "@/src/api/core/requests";

export interface AccessLog {
    id: string;
    domain: string;
    websiteId: string;
    accountId: string;
    method: string;
    uri: string;
    statusCode: number;
    responseSize: number;
    clientIp: string;
    region: string;
    userAgent: string;
    referer: string;
    requestTime: number;
    responseTime: number;
    createdAt: number;
    accountName: string;
    websiteName: string;
}

export interface DomainStats {
    domain: string;
    totalRequests: number;
    uniqueVisitors: number;
}

export interface StatusCodeStats {
    statusCode: number;
    count: number;
}

export interface HourlyStats {
    hour: number;
    count: number;
}

export interface TotalStats {
    totalRequests: number;
    uniqueDomains: number;
    uniqueVisitors: number;
    avgResponseTime: number;
}

export interface DateCounter {
    date: string;
    value: number;
}

// 新增接口定义
export interface WebsiteStats {
    websiteId: string;
    websiteName: string;
    domain: string;
    pv: number; // 页面浏览量
    uv: number; // 独立访客
    ip: number; // 独立IP数
    traffic: number; // 流量大小（字节）
    requests: number; // 请求数量
    realtimeTraffic: number; // 实时流量（字节/秒）
    requestsPerSecond: number; // 每秒请求数
    avgResponseTime: number; // 平均响应时间
}

export interface WebsiteTrafficTrend {
    time: string;
    pv: number;
    uv: number;
    traffic: number;
    requests: number;
}

export interface TopPages {
    uri: string;
    pv: number;
    uv: number;
    avgResponseTime: number;
}

export interface TopReferers {
    referer: string;
    count: number;
}

export interface RealtimeMetrics {
    currentOnline: number;
    requestsPerSecond: number;
    trafficPerSecond: number;
    avgResponseTime: number;
    errorRate: number;
}

class AccessLogApi extends Api<AccessLog> {
    constructor() {
        super("admin/access-logs");
    }

    clear = async () => {
        await requests.post(`/${this.group}/clear`);
    }

    getDomainStats = async (days: number = 7): Promise<DomainStats[]> => {
        return await requests.get(`/${this.group}/domain-stats?days=${days}`);
    }

    getDailyStats = async (days: number = 7): Promise<DateCounter[]> => {
        return await requests.get(`/${this.group}/daily-stats?days=${days}`);
    }

    getStatusCodeStats = async (days: number = 7): Promise<StatusCodeStats[]> => {
        return await requests.get(`/${this.group}/status-code-stats?days=${days}`);
    }

    getHourlyStats = async (days: number = 7): Promise<HourlyStats[]> => {
        return await requests.get(`/${this.group}/hourly-stats?days=${days}`);
    }

    getTotalStats = async (days: number = 7): Promise<TotalStats> => {
        return await requests.get(`/${this.group}/total-stats?days=${days}`);
    }

    // 新增方法：获取网站统计
    getWebsiteStats = async (websiteId: string, period: string): Promise<WebsiteStats> => {
        const params = new URLSearchParams({ period });
        if (websiteId) {
            params.append('websiteId', websiteId);
        }
        return await requests.get(`/${this.group}/website-stats?${params}`);
    }

    // 获取网站流量趋势
    getWebsiteTrafficTrend = async (websiteId: string, period: string): Promise<WebsiteTrafficTrend[]> => {
        const params = new URLSearchParams({ period });
        if (websiteId) {
            params.append('websiteId', websiteId);
        }
        return await requests.get(`/${this.group}/website-traffic-trend?${params}`);
    }

    // 获取热门页面
    getTopPages = async (websiteId: string, period: string, limit: number = 10): Promise<TopPages[]> => {
        const params = new URLSearchParams({ period, limit: limit.toString() });
        if (websiteId) {
            params.append('websiteId', websiteId);
        }
        return await requests.get(`/${this.group}/top-pages?${params}`);
    }

    // 获取热门来源
    getTopReferers = async (websiteId: string, period: string, limit: number = 10): Promise<TopReferers[]> => {
        const params = new URLSearchParams({ period, limit: limit.toString() });
        if (websiteId) {
            params.append('websiteId', websiteId);
        }
        return await requests.get(`/${this.group}/top-referers?${params}`);
    }

    // 获取实时指标
    getRealtimeMetrics = async (websiteId: string): Promise<RealtimeMetrics> => {
        const params = new URLSearchParams();
        if (websiteId) {
            params.append('websiteId', websiteId);
        }
        return await requests.get(`/${this.group}/realtime-metrics?${params}`);
    }

    // 获取小时级别统计
    getWebsiteHourlyStats = async (websiteId: string, period: string): Promise<HourlyStats[]> => {
        const params = new URLSearchParams({ period });
        if (websiteId) {
            params.append('websiteId', websiteId);
        }
        return await requests.get(`/${this.group}/website-hourly-stats?${params}`);
    }

    // 获取状态码统计
    getWebsiteStatusCodeStats = async (websiteId: string, period: string): Promise<StatusCodeStats[]> => {
        const params = new URLSearchParams({ period });
        if (websiteId) {
            params.append('websiteId', websiteId);
        }
        return await requests.get(`/${this.group}/website-status-code-stats?${params}`);
    }
}

const accessLogApi = new AccessLogApi();
export default accessLogApi; 