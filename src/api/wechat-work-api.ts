import {Api} from './core/api';
import requests from './core/requests';

export interface WechatWorkAuthorizeResponse {
    authorizeUrl: string;
}

export interface WechatWorkLoginResponse {
    token: string;
    needTotp: boolean;
}

class WechatWorkApi extends Api<any> {
    constructor() {
        super('account');
    }

    // 获取企业微信授权链接
    getAuthorizeUrl = async (state?: string): Promise<WechatWorkAuthorizeResponse> => {
        const params = state ? `?state=${encodeURIComponent(state)}` : '';
        return await requests.get(`/wechat-work/authorize${params}`);
    }

    // 企业微信登录
    login = async (code: string): Promise<WechatWorkLoginResponse> => {
        return await requests.post(`/wechat-work/login?code=${encodeURIComponent(code)}`);
    }
}

const wechatWorkApi = new WechatWorkApi();
export default wechatWorkApi;