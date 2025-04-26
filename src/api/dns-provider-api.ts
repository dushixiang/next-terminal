import requests from "@/src/api/core/requests";

export interface DNSProvider {
    ok: boolean;
    email: string;
    type: string;
    tencentcloud: Tencentcloud;
    alidns: Alidns;
    cloudflare: Cloudflare;
    huaweicloud: Huaweicloud;
}

interface Huaweicloud {
    accessKeyId: string;
    secretAccessKey: string;
}

interface Cloudflare {
    apiToken: string;
    zoneToken: string;
}

interface Alidns {
    accessKeyId: string;
    accessKeySecret: string;
}

interface Tencentcloud {
    secretId: string;
    secretKey: string;
}

class DnsProviderApi {
    group = "admin/dns-providers";

    get = async () => {
        return await requests.get(`/${this.group}/config`) as DNSProvider;
    }

    set = async (values: any) => {
        return await requests.put(`/${this.group}/config`, values);
    }

    remove = async () => {
        await requests.delete(`/${this.group}/config`);
    }
}

let dnsProviderApi = new DnsProviderApi();
export default dnsProviderApi;