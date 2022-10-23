import request from "../common/request";
import qs from "qs";

class AccountApi {

    group = 'account';

    logout = async () => {
        let result = await request.post('/account/logout');
        return result['code'] === 1
    }

    getUserInfo = async () => {
        let result = await request.get(`/${this.group}/info`);
        if (result['code'] !== 1) {
            return {};
        }
        return result['data'];
    }

    assetPaging = async (params) => {
        let paramsStr = qs.stringify(params);
        let result = await request.get(`/${this.group}/assets?${paramsStr}`);
        if (result['code'] !== 1) {
            return {};
        }
        return result['data'];
    }

    getAccessToken = async () => {
        let result = await request.get(`/${this.group}/access-token`);
        if (result['code'] !== 1) {
            return {};
        }
        return result['data'];
    }

    createAccessToken = async () => {
        let result = await request.post(`/${this.group}/access-token`);
        if (result['code'] !== 1) {
            return {};
        }
        return result['data'];
    }

    deleteAccessToken = async () => {
        let result = await request.delete(`/${this.group}/access-token`);
        return result['code'] === 1;
    }

    changePassword = async (values) => {
        let result = await request.post(`/${this.group}/change-password`, values);
        return result.code === 1;
    }

    reloadTotp = async () => {
        let result = await request.get('/account/reload-totp');
        if (result.code === 1) {
            return result.data;
        } else {
            return {}
        }
    }

    confirmTotp = async (values) => {
        let result = await request.post(`/${this.group}/confirm-totp`, values);
        return result.code === 1;
    }


    resetTotp = async () => {
        let result = await request.post(`/${this.group}/reset-totp`);
        return result.code === 1;
    }
}

let accountApi = new AccountApi();
export default accountApi;