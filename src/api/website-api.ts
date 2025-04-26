import {Api} from "@/src/api/core/api";

export interface Website {
    id: string;
    logo: string;
    name: string;
    enabled: boolean;
    targetUrl: string;
    targetHost: string;
    targetPort: number;
    domain: string;
    asciiDomain: string;
    entrance: string;
    description: string;
    status: string;
    statusText: string;
    agentGatewayId: string;
    basicAuth: BasicAuth;
    headers?: any;
    cert: Cert;
    public: Public;
    createdAt: number;

    scheme: string;
    host: string;
    port: number;

    outerUrl: string;
}

interface Public {
    enabled: boolean;
    ip: string;
    expiredAt: number;
    password: string;
}

interface Cert {
    enabled: boolean;
    cert: string;
    key: string;
}

interface BasicAuth {
    enabled: boolean;
    username: string;
    password: string;
}

class WebsiteApi extends Api<Website> {
    constructor() {
        super("admin/websites");
    }
}

const websiteApi = new WebsiteApi();
export default websiteApi;