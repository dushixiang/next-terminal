import { Dayjs } from "dayjs";

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
    gatewayId?: string;
    preserveHost?: boolean;
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
    };
    tempAllow?: {
        enabled: boolean;
        durationMinutes?: number;
        autoRenew?: boolean;
    };
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
