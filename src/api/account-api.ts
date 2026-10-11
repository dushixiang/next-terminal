import requests, {baseUrl} from "./core/requests";
import {setCurrentUser} from "@/utils/permission";
import eventEmitter from "@/api/core/event-emitter";
import {browserDownload} from "@/utils/utils";
import type {startAuthentication, startRegistration} from "@simplewebauthn/browser";

type PublicKeyCredentialCreationOptionsJSON = Parameters<typeof startRegistration>[0]['optionsJSON'];
type PublicKeyCredentialRequestOptionsJSON = Parameters<typeof startAuthentication>[0]['optionsJSON'];

export interface AccessTokenItem {
    id: string;
    name?: string;
    token: string;
    type: string;
    source?: string;
    sourceName?: string;
    createdFrom?: string;
    expiresAt?: number;
    createdAt: number;
}

export interface OAuthScope {
    key: string;
}

export interface OAuthConsentPageData {
    name: string;
    callback: string;
    scopes: OAuthScope[];
}

export interface OAuthConsentResult {
    redirectUrl: string;
}

export interface AccessTokenCreateResult {
    id: string;
    name: string;
    token: string;
    mask: string;
    type: string;
    createdAt: number;
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

export interface AccountSSHKeyItem {
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
    ldapEnabled?: boolean;
    captchaEnabled?: boolean;
    smsEnabled?: boolean;
    webauthnEnabled: boolean;
    wechatWorkEnabled: boolean;
    oidcEnabled: boolean;
}

export type Captcha = {
    enabled: boolean
    key: string
    image: string
    tile: string
    width: number
    height: number
    tileWidth: number
    tileHeight: number
    tileY: number
}

export type CaptchaProof = {key: string; expiresAt: number};
export type CaptchaVerification = {key: string; expiresIn: number};

export type LoginAccount = {
    source?: 'password' | 'ldap'
    username: string
    password: string
    key: string
}

export type NotificationPreferences = {wecomEnabled: boolean; emailEnabled: boolean; accessRequestResults: boolean; workOrderResults: boolean; pendingApprovals: boolean};
export type NotificationPreferencesResponse = {preferences: NotificationPreferences; mail: string; mailEnabled: boolean; canReceivePendingApproval: boolean; wecomChannelEnabled: boolean; wecomBound: boolean};

export type LoginResult = {
    token: string
    needTotp: boolean
}

export type ExternalLoginResult = LoginResult & {
    bindRequired: boolean
    bindToken?: string
    provider?: 'oidc' | 'wechat'
    suggestedUsername?: string
    suggestedNickname?: string
    mail?: string
}

export type CompleteExternalLogin = {
    bindToken: string
    action: 'create' | 'bind'
    username: string
    password?: string
    nickname?: string
    totp?: string
}

export type BindCurrentExternalLogin = {
    bindToken: string
}

export type VerificationPurpose = 'mfa' | 'email-change' | 'phone-change';
export type DeliveryChannel = 'email' | 'sms';
export type VerificationChallenge = {challengeId: string; destination: string; expiresIn: number; retryAfter: number};
export type SendVerificationCode = {channel: DeliveryChannel; purpose: VerificationPurpose; value?: string; password?: string};

export type ChangeAccountInfo = {
    nickname: string;
    language?: string;
}

export type AccountInfo = {
    mailVerificationEnabled: boolean;
    smsVerificationEnabled: boolean;
    mail: string;
    phone: string;
    status: 'enabled' | 'disabled';
    recording: 'enabled' | 'disabled';
    watermark: 'enabled' | 'disabled';
    departments: {id: string; name: string; path: string}[];
    roleDetails: {id: string; name: string}[];
    createdAt: number;
    lastLoginAt: number;
    id: string;
    username: string;
    nickname: string;
    type: string;
    enabledTotp: boolean;
    mfaEnabled: boolean;
    roles: string[];
    permissions?: {method: string; path: string}[];
    menus?: Menu[];
    language: string;
    forceTotpEnabled: boolean
    needChangePassword: boolean
    accessRequestEnabled: boolean
    apiKeyAccessEnabled: boolean
    dev: boolean
    passwordSet: boolean
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

export type AuthType = 'passkey' | 'otp' | 'email' | 'sms' | 'none' | '';

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

    getNotificationPreferences = async () => await requests.get<NotificationPreferencesResponse>(`/${this.group}/notification-preferences`);

    setNotificationPreferences = async (values: NotificationPreferences) => await requests.put<void>(`/${this.group}/notification-preferences`, values);

    getSMSLoginCaptcha = async () => await requests.get<Captcha>('/sms-login/captcha');

    sendSMSLoginCode = async (values: {phone: string; key: string}) =>
        await requests.post<VerificationChallenge>('/sms-login/code', values, {errorMode: 'local'});

    loginBySMS = async (values: {phone: string; challengeId: string; code: string}) =>
        await requests.post<LoginResult>('/sms-login', values, {errorMode: 'local'});

    login = async (account: LoginAccount) => {
        return await requests.post('/login', account, {errorMode: 'local'}) as LoginResult;
    }

    completeExternalLogin = async (request: CompleteExternalLogin) => {
        return await requests.post('/external-login/complete', request) as ExternalLoginResult;
    }

    bindCurrentExternalLogin = async (request: BindCurrentExternalLogin) => {
        return await requests.post<void>(`/${this.group}/external-login/bind-current`, request);
    }

    validateTOTP = async (values: any) => {
        return await requests.post(`/validate-totp`, values);
    }

    logout = async () => {
        return await requests.post<void>('/logout')
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

    getAccessTokens = async () => {
        return await requests.get(`/${this.group}/access-token`) as AccessTokenItem[];
    }

    createAccessToken = async (name: string, type: string = 'api', expiresAt?: number) => {
        return await requests.post(`/${this.group}/access-token`, {name, type, expiresAt}) as AccessTokenCreateResult;
    }

    updateAccessToken = async (id: string, name: string) => {
        return await requests.put<void>(`/${this.group}/access-token/${encodeURIComponent(id)}`, {name});
    }

    deleteAccessToken = async (id: string) => {
        return await requests.delete<void>(`/${this.group}/access-token/${id}`);
    }

    getClientCert = async () => {
        return await requests.get(`/${this.group}/client-cert`) as UserClientCertInfo | null;
    }

    getSSHKeys = async () => {
        return await requests.get(`/${this.group}/ssh-keys`) as AccountSSHKeyItem[];
    }

    createSSHKey = async (values: { name?: string; publicKey: string; securityToken?: string }) => {
        return await requests.post(`/${this.group}/ssh-keys`, values) as AccountSSHKeyItem;
    }

    updateSSHKey = async (id: string, values: { name: string }) => {
        return await requests.put(`/${this.group}/ssh-keys/${encodeURIComponent(id)}`, values) as AccountSSHKeyItem;
    }

    deleteSSHKey = async (id: string, securityToken?: string) => {
        return await requests.delete<void>(`/${this.group}/ssh-keys/${encodeURIComponent(id)}`, {securityToken});
    }

    downloadClientCert = () => {
        browserDownload(`${baseUrl()}/${this.group}/client-cert/download`);
    }

    revokeClientCert = async () => {
        return await requests.delete<void>(`/${this.group}/client-cert`);
    }

    getPasswordPolicy = async () => {
        return await requests.get(`/${this.group}/password-policy`) as PasswordPolicy;
    }

    changePassword = async (values: any) => {
        await requests.post<void>(`/${this.group}/change-password`, values);
    }

    changeInfo = async (values: ChangeAccountInfo) => {
        return await requests.post<void>(`/${this.group}/change-info`, values);
    }

    reloadTotp = async (host: string) => {
        return await requests.get(`/account/reload-totp?host=${encodeURIComponent(host)}`) as Totp;
    }

    confirmTotp = async (values: any) => {
        await requests.post<void>(`/${this.group}/confirm-totp`, values);
    }

    resetTotp = async (securityToken: string) => {
        await requests.post<void>(`/${this.group}/reset-totp`, undefined, {securityToken});
    }

    getCaptcha = async () => {
        return await requests.get('/captcha') as Captcha;
    }

    verifyCaptcha = async (values: {key: string; purpose: 'login' | 'sms'; x: number}) =>
        await requests.post<CaptchaVerification>('/captcha/verify', values, {errorMode: 'local'});

    getWebauthnCredentials = async () => {
        return await requests.get(`/${this.group}/webauthn/credentials`) as WebauthnCredential[];
    }

    updateWebauthnCredentials = async (id: string, val: any) => {
        await requests.put<void>(`/${this.group}/webauthn/credentials/${id}`, val);
    }

    deleteWebauthnCredentials = async (id: string, securityToken?: string) => {
        await requests.delete<void>(`/${this.group}/webauthn/credentials/${id}`, {securityToken});
    }

    webauthnCredentialStart = async (securityToken?: string) => {
        return await requests.post(`/${this.group}/webauthn/credentials/start`, undefined, {securityToken}) as WebauthnCredentialCreation;
    }

    webauthnCredentialFinish = async (val: any) => {
        return await requests.post<void>(`/${this.group}/webauthn/credentials/finish`, val);
    }

    webauthnLoginStartV2 = async () => {
        return await requests.post(`/v2/webauthn-login-start`,) as WebauthnCredentialRequest;
    }

    webauthnLoginFinishV2 = async (token: string, val: any) => {
        return await requests.post(`/v2/webauthn-login-finish?token=${token}`, val) as LoginResult;
    }

    sendVerificationCode = async (values: SendVerificationCode, securityToken?: string) => {
        return await requests.post<VerificationChallenge>(`/${this.group}/verification-code`, values, {securityToken, errorMode: 'local'});
    }

    verifyAccountCode = async (values: {challengeId: string; purpose: VerificationPurpose; code: string}) => {
        return await requests.post<{token?: string}>(`/${this.group}/verification-code/verify`, values, {errorMode: 'local'});
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
        let data = await requests.post(`/${this.group}/security-token/mfa?passcode=${passcode}`, undefined, {
            errorMode: 'local',
        });
        return data['token'];
    }

    validateSecurityToken = async (token: string) => {
        let data = await requests.post(`/${this.group}/security-token/validate`, undefined, {securityToken: token});
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
        return await requests.delete<void>(`/${this.group}/oidc-server-consents/${clientId}`);
    }

    // 第三方 OAuth 授权流程：获取同意页元数据
    getOAuthConsentPage = async (authorizeId: string) => {
        const data = await requests.get(`/oauth/consent?authorize_id=${encodeURIComponent(authorizeId)}`);
        return data as OAuthConsentPageData;
    }

    // 第三方 OAuth 授权流程：提交同意 / 拒绝
    submitOAuthConsent = async (authorizeId: string, approve: boolean): Promise<OAuthConsentResult> => {
        return await requests.post(`/oauth/consent`, {
            authorizeId: authorizeId,
            approve: approve,
        });
    }
}

let accountApi = new AccountApi();
export default accountApi;
