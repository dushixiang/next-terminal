import {Api} from "./core/api";
import requests from "@/api/core/requests";

export interface Credential {
    id: string;
    name: string;
    type: string;
    username: string;
    password: string;
    privateKey: string;
    passphrase: string;
    createdAt: number;
}

class CredentialApi extends Api<Credential> {
    constructor() {
        super("admin/credentials");
    }

    genPrivateKey = async () => {
        return await requests.post(`/${this.group}/gen-private-key`) as string;
    }

    getPublicKey = async (id: string) => {
        return await requests.get(`/${this.group}/${id}/public-key`) as string;
    }

    decrypt = async (id: string, securityToken: string) => {
        return await requests.get(`/${this.group}/${id}/decrypted?securityToken=${securityToken}`) as Credential;
    }
}

let credentialApi = new CredentialApi();
export default credentialApi;