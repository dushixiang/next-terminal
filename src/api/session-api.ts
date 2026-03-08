import {Api} from "@/api/core/api";
import requests from "@/api/core/requests";

export interface Session {
    region: string;
    id: string;
    clientIp: string;
    protocol: string;
    ip: string;
    port: number;
    username: string;
    assetId: string;
    assetName: string;
    userId: string;
    userAccount: string;
    status: string;
    connectedAt: number;
    disconnectedAt: number;
    connectionDuration: string;
    recording: string;
    recordingSize: number;
    commandCount: number;
    auditStatus: string;
}

export interface SessionWatermark {
    enabled: boolean
    content?: string[];
    color?: string;
    size: number;
}

export interface SessionCommand {
    id: string;
    sessionId: string;
    riskLevel: number;
    command: string;
    result: string;
    createdAt: number;
}

export interface SessionSharer {
    ok: boolean
    url: string
}

export interface SessionAudit {
    id: string;
    sessionId: string;
    status: 'pending' | 'completed' | 'failed';
    content: string;
    error: string;
    createdAt: number;
    updatedAt: number;
}

class SessionApi extends Api<Session> {
    constructor() {
        super("admin/sessions");
    }

    disconnect = async (sessionId: string) => {
        await requests.post(`/${this.group}/${sessionId}/disconnect`);
    }

    clear = async () => {
        await requests.post(`/${this.group}/clear`);
    }

    auditEnabled = async (): Promise<{ terminalEnabled: boolean }> => {
        return await requests.get(`/${this.group}/audit-enabled`);
    }

    triggerAudit = async (sessionId: string): Promise<SessionAudit> => {
        return await requests.post(`/${this.group}/${sessionId}/audit`);
    }

    getAudit = async (sessionId: string): Promise<SessionAudit | null> => {
        return await requests.get(`/${this.group}/${sessionId}/audit`);
    }
}

const sessionApi = new SessionApi();
export default sessionApi;