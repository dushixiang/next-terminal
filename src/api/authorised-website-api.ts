import requests from "./core/requests";

class AuthorisedWebsiteApi {

    group = "admin/authorised-website";

    bindingUser = async (websiteId: string, userIds: string[]) => {
        return await requests.post(`/${this.group}/binding-user?websiteId=${websiteId}`, userIds);
    }

    unboundUser = async (websiteId: string, userIds: string[]) => {
        return await requests.post(`/${this.group}/unbound-user?websiteId=${websiteId}`, userIds);
    }

    boundUser = async (websiteId: string) => {
        return await requests.get(`/${this.group}/bound-user?websiteId=${websiteId}`) as string[];
    }

    bindingUserGroup = async (websiteId: string, userIds: string[]) => {
        return await requests.post(`/${this.group}/binding-user-group?websiteId=${websiteId}`, userIds);
    }

    unboundUserGroup = async (websiteId: string, userIds: string[]) => {
        return await requests.post(`/${this.group}/unbound-user-group?websiteId=${websiteId}`, userIds);
    }

    boundUserGroup = async (websiteId: string) => {
        return await requests.get(`/${this.group}/bound-user-group?websiteId=${websiteId}`) as string[];
    }
}

const authorisedWebsiteApi = new AuthorisedWebsiteApi();
export default authorisedWebsiteApi;