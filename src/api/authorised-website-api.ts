import qs from "qs";
import requests from "./core/requests";

export interface AuthorisedWebsite {
    id: string;
    websiteId: string;
    websiteName: string;
    userId: string;
    userName: string;
    departmentId: string;
    departmentName: string;
    expiredAt: number;
    createdAt: number;
}

class AuthorisedWebsiteApi {

    group = "admin/authorised-website";

    paging = async (params: any) => {
        return await requests.get(`/${this.group}/paging?${qs.stringify(params)}`);
    }

    deleteById = async (id: string) => {
        return await requests.delete(`/${this.group}/${id}`);
    }

    authorise = async (values: any) => {
        return await requests.post(`/${this.group}`, values);
    }
}

const authorisedWebsiteApi = new AuthorisedWebsiteApi();
export default authorisedWebsiteApi;