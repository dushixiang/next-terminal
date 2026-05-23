import {WebsiteFormData, WebsiteOriginHostMode} from "@/pages/assets/website-drawer/types";

export interface WebsiteBasicFormData extends WebsiteFormData {
    originHostMode?: WebsiteOriginHostMode;
    originHostCustom?: string;
}

export const getDefaultWebsiteData = (): Partial<WebsiteBasicFormData> => ({
    enabled: true,
    scheme: 'http',
    port: 80,
    gatewayType: '',
    cert: {
        enabled: false
    },
    public: {
        enabled: false,
        expiredAt: 0,
        countries: [],
        provinces: [],
        cities: [],
        headerWhitelist: [],
        pathWhitelist: []
    },
    tempAllow: {
        enabled: false,
        durationMinutes: 5,
        autoRenew: false
    },
    originHostMode: 'origin',
    originHostCustom: ''
});

interface WebsiteOriginHostData {
    originHostMode?: string;
    originHostCustom?: string;
}

export const normalizeOriginHostMode = (originHostMode?: string): WebsiteOriginHostMode => {
    if (originHostMode === 'service' || originHostMode === 'custom') {
        return originHostMode;
    }
    return 'origin';
};

export const inferOriginHost = (website: WebsiteOriginHostData) => {
    const originHostMode = normalizeOriginHostMode(website.originHostMode);
    if (website.originHostMode) {
        return {
            originHostMode,
            originHostCustom: website.originHostCustom || ''
        };
    }
    return {
        originHostMode: 'origin',
        originHostCustom: ''
    };
};

export const getWebsiteHeaders = (
    websiteData: Partial<WebsiteFormData> | undefined,
    values: WebsiteBasicFormData
) => {
    const sourceHeaders = websiteData?.headers || values.headers || [];
    return sourceHeaders.filter(item => item.name?.toLowerCase() !== 'host');
};
