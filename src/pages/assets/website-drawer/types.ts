import { Dayjs } from "dayjs";

export type WebsiteOriginHostMode = 'origin' | 'service' | 'custom';

export interface ParsedURL {
    scheme: string;
    host: string;
    port: string;
}

export interface WebsiteFormData {
    id?: string;
    name: string;
    domain: string;
    entrance?: string;
    enabled: boolean;
    scheme: string;
    host: string;
    port: number;
    targetUrl: string;
    logo?: string;
    groupId?: string;
    gatewayType?: string;
    gatewayId?: string;
    originHostMode?: WebsiteOriginHostMode;
    originHostCustom?: string;
    disableAccessLog?: boolean;
    headers?: Array<{ name: string; value: string }>;
    basicAuth?: {
        enabled: boolean;
        username?: string;
        password?: string;
    };
    cert?: {
        enabled: boolean;
        certId?: string;
    };
    public?: {
        enabled: boolean;
        expiredAt?: number;
        ip?: string;
        password?: string;
        timeLimit?: boolean;
        countries?: string[];
        provinces?: string[];
        cities?: string[];
        headerWhitelist?: string[];
        pathWhitelist?: string[];
    };
    tempAllow?: {
        enabled: boolean;
        durationMinutes?: number;
        autoRenew?: boolean;
    };
    modifyRules?: any[];
}

export interface LogoItem {
    name: string;
    data: string;
}

export interface PublicViewProps {
    timeLimit: boolean;
    onTimeLimitChange: (checked: boolean) => void;
    expiredAt?: Dayjs;
    onExpiredAtChange: (date: Dayjs | null) => void;
}
