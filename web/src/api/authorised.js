import qs from "qs";
import request from "../common/request";

class AuthorisedApi {

    group = "authorised";

    GetAssetPaging = async (params) => {
        let paramsStr = qs.stringify(params);
        let result = await request.get(`/${this.group}/assets/paging?${paramsStr}`);
        if (result['code'] !== 1) {
            return {};
        }
        return result['data'];
    }

    GetUserPaging = async (params) => {
        let paramsStr = qs.stringify(params);
        let result = await request.get(`/${this.group}/users/paging?${paramsStr}`);
        if (result['code'] !== 1) {
            return {};
        }
        return result['data'];
    }

    GetUserGroupPaging = async (params) => {
        let paramsStr = qs.stringify(params);
        let result = await request.get(`/${this.group}/user-groups/paging?${paramsStr}`);
        if (result['code'] !== 1) {
            return {};
        }
        return result['data'];
    }

    AuthorisedAssets = async (data) => {
        const result = await request.post(`/${this.group}/assets`, data);
        return result['code'] === 1;
    }

    AuthorisedUsers = async (data) => {
        const result = await request.post(`/${this.group}/users`, data);
        return result['code'] === 1;
    }

    AuthorisedUserGroups = async (data) => {
        const result = await request.post(`/${this.group}/user-groups`, data);
        return result['code'] === 1;
    }

    GetSelected = async (params) => {
        let paramsStr = qs.stringify(params);
        let result = await request.get(`/${this.group}/selected?${paramsStr}`);
        if (result['code'] !== 1) {
            return [];
        }
        return result['data'];
    }

    DeleteById = async (id) => {
        const result = await request.delete(`/${this.group}/${id}`);
        return result['code'] === 1;
    }
}

const authorisedApi = new AuthorisedApi();
export default authorisedApi;