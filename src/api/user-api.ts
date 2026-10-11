import {Api} from "./core/api";
import requests from "./core/requests";
import type {RegionInfo} from "@/api/region-info";

export interface LDAPTestResult {
    hasUsers: boolean;
}

export interface User {
    id: string;
    username: string;
    nickname: string;
    status: string;
    type: string;
    mail: string;
    createdAt: number;
    roles: string[];
    lastLoginAt: number;
    departments?: SimpleDepartment[];
    remark?: string;
    enabledTotp?: boolean;
    passwordSet?: boolean;
}

interface SimpleDepartment {
    id: string;
    name: string;
}

export interface LoginLog {
    id: string;
    username: string;
    clientIp: string;
    userAgent?: UserAgent;
    loginAt: number;
    success: boolean;
    reason: string;
    regionInfo?: RegionInfo;
}

export interface UserAgent {
    VersionNo: VersionNo;
    OSVersionNo: VersionNo;
    URL: string;
    String: string;
    Name: string;
    Version: string;
    OS: string;
    OSVersion: string;
    Device: string;
    Mobile: boolean;
    Tablet: boolean;
    Desktop: boolean;
    Bot: boolean;
}

export interface VersionNo {
    Major: number;
    Minor: number;
    Patch: number;
}

export interface CreateUserResult {
    id: string;
    nickname: string
    username: string
    password: string
}

export interface UserClientCertInfo {
    id: string;
    serialNumber: string;
    fingerprint: string;
    notBefore: number;
    notAfter: number;
    status: string;
    revokedAt: number;
    lastUsedAt: number;
    createdAt: number;
}

export interface UserExternalIdentity {
    id: string;
    provider: string;
    providerKey: string;
    subject: string;
    username: string;
    nickname: string;
    mail: string;
    legacy: boolean;
    createdAt: number;
    lastLoginAt: number;
}

export interface UserWebauthnCredential {
    id: string;
    name: string;
    createdAt: number;
    usedAt: number;
}

export interface UserSSHKeyItem {
    id: string;
    name: string;
    fingerprint: string;
    algorithm: string;
    publicKey: string;
    comment: string;
    lastUsedAt: number;
    createdAt: number;
    updatedAt: number;
}

export interface UserAccessTokenItem {
    id: string;
    token: string;
    type: string;
    source?: string;
    sourceName?: string;
    createdFrom?: string;
    expiresAt?: number;
    createdAt: number;
}

export interface UserOidcConsentItem {
    id: string;
    clientId: string;
    scopes: string[];
    createdAt: number;
    updatedAt: number;
}

export interface SetupStatus {
    needSetup: boolean;
}

class UserApi extends Api<User> {
    constructor() {
        super("admin/users");
    }

    testLdap = async (values: Record<string, unknown>) => {
        return await requests.post<LDAPTestResult>(`/${this.group}/test-ldap`, values, {errorMode: 'local'});
    }

    resetTOTP = async (keys: string[], securityToken: string) => {
        await requests.post<void>(`/${this.group}/reset-totp`, keys, {securityToken});
    }

    clearPasskeys = async (keys: string[], securityToken: string) => {
        await requests.post<void>(`/${this.group}/clear-passkeys`, keys, {securityToken});
    }

    resetPassword = async (keys: string[], password?: string) => {
        let result = await requests.post(`/${this.group}/reset-password`, {
            'keys': keys,
            'password': password,
        });
        return result['password'];
    }

    changeStatus = async (id: string, status: string) => {
        await requests.patch<void>(`/${this.group}/${id}/status?status=${status}`);
    }

    // 不需要登录
    setupUser = async (values: any) => {
        await requests.post(`/setup-user`, values);
    }

    // 不需要登录
    getSetupStatus = async () => {
        return await requests.get(`/setup-status`) as SetupStatus;
    }

    import = async (file: File) => {
        let formData = new FormData();
        formData.append("file", file);
        await requests.postForm<void>(`/${this.group}/import`, formData);
    }

    getUserClientCert = async (userId: string) => {
        return await requests.get(`/${this.group}/${userId}/client-cert`) as UserClientCertInfo | null;
    }

    revokeUserClientCert = async (userId: string) => {
        return await requests.delete<void>(`/${this.group}/${userId}/client-cert`);
    }

    getExternalIdentities = async (userId: string) => {
        return await requests.get(`/${this.group}/${userId}/external-identities`) as UserExternalIdentity[];
    }

    deleteExternalIdentity = async (userId: string, identityId: string) => {
        return await requests.delete<void>(`/${this.group}/${userId}/external-identities/${identityId}`);
    }

    getWebauthnCredentials = async (userId: string) => {
        return await requests.get(`/${this.group}/${userId}/webauthn/credentials`) as UserWebauthnCredential[];
    }

    deleteWebauthnCredential = async (userId: string, credentialId: string, securityToken: string) => {
        return await requests.delete<void>(`/${this.group}/${userId}/webauthn/credentials/${credentialId}`, {securityToken});
    }

    getSSHKeys = async (userId: string) => {
        return await requests.get(`/${this.group}/${userId}/ssh-keys`) as UserSSHKeyItem[];
    }

    deleteSSHKey = async (userId: string, sshKeyId: string) => {
        return await requests.delete<void>(`/${this.group}/${userId}/ssh-keys/${sshKeyId}`);
    }

    getAccessTokens = async (userId: string) => {
        return await requests.get(`/${this.group}/${userId}/access-tokens`) as UserAccessTokenItem[];
    }

    deleteAccessToken = async (userId: string, tokenId: string) => {
        return await requests.delete<void>(`/${this.group}/${userId}/access-tokens/${tokenId}`);
    }

    getOidcServerConsents = async (userId: string) => {
        return await requests.get(`/${this.group}/${userId}/oidc-server-consents`) as UserOidcConsentItem[];
    }

    revokeOidcServerConsent = async (userId: string, clientId: string) => {
        return await requests.delete<void>(`/${this.group}/${userId}/oidc-server-consents/${clientId}`);
    }
}

const userApi = new UserApi();
export default userApi;
