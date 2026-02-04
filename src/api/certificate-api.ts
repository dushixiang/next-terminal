import {Api} from "./core/api";
import requests, {baseUrl, getToken} from "./core/requests";
import {browserDownload} from "@/utils/utils";

export interface Certificate {
    id: string;
    commonName: string;
    subject: string;
    issuer: string;
    notBefore: number;
    notAfter: number;
    type: string;
    storageKey: string;
    certificate: string;
    privateKey: string;
    requireClientAuth: boolean;
    issuedStatus: string;
    issuedError: string;
    updatedAt: number;
    isDefault: boolean;
}

class CertificateApi extends Api<Certificate> {
    constructor() {
        super("admin/certificates");
    }

    updateAsDefault = async (id: string) => {
        await requests.patch(`/${this.group}/${id}/default`)
    }

    download = async (id: string, commonName: string) => {
        let u = `${baseUrl()}/${this.group}/${id}/download?X-Auth-Token=${getToken()}`
        browserDownload(u)
    }

    renew = async (id: string) => {
        return await requests.post(`/${this.group}/${id}/renew`)
    }
}

let certificateApi = new CertificateApi();
export default certificateApi;
