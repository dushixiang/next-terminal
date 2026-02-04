import requests from "./core/requests";
import strings from "../utils/strings";

export interface LatestVersion {
    currentVersion: string;
    latestVersion: string;
    upgrade: boolean;
    content: string;
}

const booleanKeys = [
    'watermark-content-user-account',
    'watermark-content-asset-username',
    'reverse-proxy-server-auto-tls',
    'reverse-proxy-server-http-redirect-to-https',
    'login-session-count-custom',
    'ssh-server-port-forwarding-enabled',
    'access-require-mfa',
    'ssh-server-disable-password-auth',
    'db-proxy-block-dml',
]

export interface UpgradeStatus {
    message: string;
    status: string;
}

export interface ClientIPs {
    direct: string;
    "x-real-ip": string;
    "x-forwarded-for": string;
}

class PropertyApi {
    group = "admin/properties";

    get = async () => {
        let properties = await requests.get(`/${this.group}`);
        for (let key in properties) {
            if (!properties.hasOwnProperty(key)) {
                continue;
            }
            if (properties[key] === '-') {
                properties[key] = '';
            }
            if (key.includes('enable')) {
                properties[key] = strings.isTrue(properties[key]);
            }
            if (key.includes('disable')) {
                properties[key] = strings.isTrue(properties[key]);
            }
            if (booleanKeys.includes(key)) {
                properties[key] = strings.isTrue(properties[key]);
            }
        }
        return properties;
    }

    set = async (values: any, securityToken?: string) => {
        const tokenParam = securityToken ? `?securityToken=${encodeURIComponent(securityToken)}` : '';
        await requests.put(`/${this.group}${tokenParam}`, values);
    }

    genRSAPrivateKey = async () => {
        let data = await requests.post(`/${this.group}/gen-rsa-private-key`);
        return data['key'] as string;
    }

    sendMail = async (values: any) => {
        await requests.post(`/${this.group}/send-mail`, values);
    }

    getLatestVersion = async () => {
        let data = await requests.get(`/${this.group}/latest-version?noerror`);
        return data as LatestVersion;
    }

    upgrade = async () => {
        await requests.post(`/${this.group}/upgrade`);
    }

    upgradeStatus = async () => {
        let data = await requests.get(`/${this.group}/upgrade-status`);
        return data as UpgradeStatus;
    }

    getClientIPs = async () => {
        let data = await requests.get(`/${this.group}/client-ips`);
        return data as ClientIPs;
    }
}

let propertyApi = new PropertyApi();
export default propertyApi;
