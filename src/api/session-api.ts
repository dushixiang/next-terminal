import {Api} from "@/src/api/core/api";
import requests from "@/src/api/core/requests";

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
}

const sessionApi = new SessionApi();
export default sessionApi;