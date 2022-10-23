import request from "../common/request";

class BrandingApi {

    getBranding = async () => {
        let result = await request.get(`/branding`);
        if (result['code'] !== 1) {
            return {};
        }
        return result['data'];
    }
}

let brandingApi = new BrandingApi();
export default brandingApi;