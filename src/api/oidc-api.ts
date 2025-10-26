import {Api} from './core/api';
import requests from './core/requests';

export interface OidcAuthorizeResponse {
    authorizeUrl: string;
    state: string;
}

export interface OidcLoginResponse {
    token: string;
    needTotp: boolean;
}

export interface OidcStatusResponse {
    enabled: boolean;
}

class OidcApi extends Api<any> {
    constructor() {
        super('account');
    }

    // 获取 OIDC 授权链接
    getAuthorizeUrl = async (state?: string): Promise<OidcAuthorizeResponse> => {
        const params = state ? `?state=${encodeURIComponent(state)}` : '';
        return await requests.get(`/oidc/authorize${params}`);
    }

    // OIDC 登录
    login = async (code: string, state?: string): Promise<OidcLoginResponse> => {
        const params = new URLSearchParams();
        params.append('code', code);
        if (state) {
            params.append('state', state);
        }
        return await requests.post(`/oidc/login?${params.toString()}`);
    }
}

const oidcApi = new OidcApi();
export default oidcApi;