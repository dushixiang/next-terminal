import {Api} from "./core/api";
import requests from "./core/requests";

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
}

let certificateApi = new CertificateApi();
export default certificateApi;