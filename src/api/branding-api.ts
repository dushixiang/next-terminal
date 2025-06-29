import requests, {baseUrl} from "./core/requests";
import {global} from "@/src/utils/global";
import strings from "@/src/utils/strings";

export interface Branding {
    copyright: string;
    logo: string;
    name: string;
    root: string;
    version: string;
    loginBackgroundColor: string
    icp: string
    hiddenUpgrade: boolean
}

class BrandingApi {
    getBranding = async () => {
        if (strings.hasText(global.branding?.name)) {
            return new Promise<Branding>((resolve, reject) => {
                resolve(global.branding);
            });
        }
        return await requests.get(`/branding`) as Branding;
    }

    getLogo = () => {
        return `${baseUrl()}/logo`;
    }
}

let brandingApi = new BrandingApi();
export default brandingApi;