import requests, {baseUrl} from "./core/requests";

export interface Branding {
    copyright: string;
    name: string;
    version: string;
    icp: string;
    hiddenUpgrade: boolean;
    debug: boolean;
}

class BrandingApi {
    getBranding = async () => {
        return await requests.get(`/branding`) as Branding;
    }

    getLogo = () => {
        return `${baseUrl()}/logo`;
    }
}

let brandingApi = new BrandingApi();
export default brandingApi;