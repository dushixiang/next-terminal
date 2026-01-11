import requests from "./core/requests";
import {setCurrentUser} from "@/utils/permission";
import eventEmitter from "@/api/core/event-emitter";
// @ts-ignore
import {PublicKeyCredentialCreationOptionsJSON} from "@simplewebauthn/browser/script/types";
// @ts-ignore
import type {PublicKeyCredentialRequestOptionsJSON} from "@simplewebauthn/browser/esm/types";

interface AccessToken {
    id: string;
    userId: string;
    userType: string;
    type: string;
    createdAt: number;
}

export interface PasswordPolicy {
    minLength: number;
    minCharacterType: number;
    mustNotContainUsername: boolean;
    mustNotBePalindrome: boolean;
    mustNotWeek: boolean;
}

// 定义状态枚举
export enum LoginStatus {
    Unlogged = "Unlogged",
    OTPRequired = "OTP Required",
    LoggedIn = "Logged In"
}

export interface LoginStatusResult {
    status: LoginStatus;
    passwordEnabled: boolean;
    webauthnEnabled: boolean;
    wechatWorkEnabled: boolean;
    oidcEnabled: boolean;
}

export type Captcha = {
    enabled: boolean
    captcha: string
    key: string
}

export type LoginAccount = {
    username: string
    password: string
    captcha: string
    key: string
}

export type LoginResult = {
    token: string
    needTotp: boolean
}

export type AccountInfo = {
    id: string;
    username: string;
    nickname: string;
    type: string;
    enabledTotp: boolean;
    roles: string[];
    menus?: Menu[];
    language: string;
    forceTotpEnabled: boolean
    needChangePassword: boolean
    dev: boolean
}

export type Menu = {
    key: string
    checked: boolean
}

export interface Totp {
    secret: string;
    url: string;
}

interface WebauthnCredentialCreation {
    publicKey: PublicKeyCredentialCreationOptionsJSON;
}

interface WebauthnCredentialRequest {
    publicKey: PublicKeyCredentialRequestOptionsJSON;
    token: string;
    type: string;
}

export interface WebauthnCredential {
    createdAt: number;
    id: string;
    name: string;
    usedAt: number;
}

export type AuthType = 'passkey' | 'otp' | 'none' | '';

export interface OidcConsentPageData {
    clientID: string;
    scopes: string[];
    redirectURI: string;
    state: string;
    requestedBy: string;
}

export interface OidcUserConsentItem {
    id: string;
    clientId: string;
    scopes: string[];
    createdAt: number;
    updatedAt: number;
}

class AccountApi {

    group = 'account';

    login = async (account: LoginAccount) => {
        return await requests.post('/login', account) as LoginResult;
    }

    validateTOTP = async (values: any) => {
        return await requests.post(`/validate-totp`, values);
    }

    logout = async () => {
        return await requests.post('/account/logout')
    }

    getLoginStatus = async () => {
        let data = await requests.get(`/login-status`);
        return data as LoginStatusResult;
    }

    getUserInfo = async () => {
        let data = await requests.get(`/${this.group}/info`) as AccountInfo;
        setCurrentUser(data);
        if (data.forceTotpEnabled && !data.enabledTotp) {
            eventEmitter.emit("API:NEED_ENABLE_OPT");
            return data;
        }

        if (data.needChangePassword) {
            eventEmitter.emit("API:NEED_CHANGE_PASSWORD");
            return data;
        }
        // eventEmitter.emit("API:CHANGE_LANG", data.language)
        return data;
    }

    getAccessToken = async () => {
        return await requests.get(`/${this.group}/access-token`) as AccessToken;
    }

    createAccessToken = async () => {
        return await requests.post(`/${this.group}/access-token`);
    }

    deleteAccessToken = async () => {
        return await requests.delete(`/${this.group}/access-token`);
    }

    getPasswordPolicy = async () => {
        return await requests.get(`/${this.group}/password-policy`) as PasswordPolicy;
    }

    changePassword = async (values: any) => {
        await requests.post(`/${this.group}/change-password`, values);
    }

    changeInfo = async (values: any) => {
        return await requests.post(`/${this.group}/change-info`, values);
    }

    reloadTotp = async (host: string) => {
        return await requests.get(`/account/reload-totp?host=${encodeURIComponent(host)}`) as Totp;
    }

    confirmTotp = async (values: any) => {
        await requests.post(`/${this.group}/confirm-totp`, values);
    }

    resetTotp = async (securityToken: string) => {
        await requests.post(`/${this.group}/reset-totp?securityToken=${securityToken}`);
    }

    getCaptcha = async () => {
        return await requests.get('/captcha') as Captcha;
    }

    getWebauthnCredentials = async () => {
        return await requests.get(`/${this.group}/webauthn/credentials`) as WebauthnCredential[];
    }

    updateWebauthnCredentials = async (id: string, val: any) => {
        await requests.put(`/${this.group}/webauthn/credentials/${id}`, val);
    }

    deleteWebauthnCredentials = async (id: string) => {
        await requests.delete(`/${this.group}/webauthn/credentials/${id}`);
    }

    webauthnCredentialStart = async () => {
        return await requests.post(`/${this.group}/webauthn/credentials/start`) as WebauthnCredentialCreation;
    }

    webauthnCredentialFinish = async (val: any) => {
        return await requests.post(`/${this.group}/webauthn/credentials/finish`, val);
    }

    webauthnLoginStartV2 = async () => {
        return await requests.post(`/v2/webauthn-login-start`,) as WebauthnCredentialRequest;
    }

    webauthnLoginFinishV2 = async (token: string, val: any) => {
        return await requests.post(`/v2/webauthn-login-finish?token=${token}`, val) as LoginResult;
    }

    getSecurityTokenSupportTypes = async () => {
        return await requests.get(`/${this.group}/security-token/support-types`) as AuthType[];
    }

    generateSecurityTokenByWebauthnStart = async () => {
        return await requests.post(`/${this.group}/security-token/webauthn-start`) as WebauthnCredentialRequest;
    }

    generateSecurityTokenByWebauthnFinish = async (token: string, val: any) => {
        let data = await requests.post(`/${this.group}/security-token/webauthn-finish?token=${token}`, val);
        return data['token'];
    }

    generateSecurityTokenByMfa = async (passcode: number) => {
        let data = await requests.post(`/${this.group}/security-token/mfa?passcode=${passcode}&noerr`);
        return data['token'];
    }

    validateSecurityToken = async (token: string) => {
        let data = await requests.post(`/${this.group}/security-token/validate?securityToken=${token}`);
        return data['ok'] as boolean;
    }

    // OIDC Server Consent 相关方法
    getOidcConsentPage = async (clientId: string, scopes: string, returnUrl: string, state?: string) => {
        const queryParams = new URLSearchParams({
            client_id: clientId,
            scopes: scopes,
            return_url: returnUrl,
            ...(state && { state: state }),
        });
        let data = await requests.get(`/oidc/server/consent?${queryParams.toString()}`);
        return data as OidcConsentPageData;
    }

    submitOidcConsent = async (clientId: string, returnUrl: string, allow: boolean, scopes: string[]): Promise<{ return_url: string }> => {
        const queryParams = new URLSearchParams({
            client_id: clientId,
            return_url: returnUrl,
        });
        return await requests.post(`/oidc/server/consent?${queryParams.toString()}`, {
            allow: allow,
            scopes: scopes,
        });
    }

    // 获取 OIDC Server 授权列表
    getOidcServerConsents = async () => {
        return await requests.get(`/${this.group}/oidc-server-consents`) as OidcUserConsentItem[];
    }

    // 撤销 OIDC Server 授权
    revokeOidcServerConsent = async (clientId: string) => {
        return await requests.delete(`/${this.group}/oidc-server-consents/${clientId}`);
    }
}

let accountApi = new AccountApi();
export default accountApi;