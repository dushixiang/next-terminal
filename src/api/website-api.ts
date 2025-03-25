import {Api} from "@/src/api/core/api";

export interface Website {
    id: string;
    logo: string;
    name: string;
    enabled: boolean;
    targetUrl: string;
    mode: string;
    domain: string;
    LocalAddr: number;
    LocalProto: string;
    localCertPem: string;
    localKeyPem: string;
    gatewayId: string;
    createdAt: number;

    scheme: string;
    host: string;
    port: number;
}

class WebsiteApi extends Api<Website> {
    constructor() {
        super("admin/websites");
    }
}

const websiteApi = new WebsiteApi();
export default websiteApi;