import requests from "@/api/core/requests";
import {Strategy} from "@/api/strategy-api";
import {SessionWatermark} from "@/api/session-api";

export interface AnonymousSession {
    id: string
    assetName: string
    strategy: Strategy
    watermark: SessionWatermark
}

class AnonymousApi {
    getSessionById = async (sessionId: string) => {
        return await requests.get(`/access/session?sessionId=${sessionId}`) as AnonymousSession;
    }
}

let anonymousApi = new AnonymousApi();
export default anonymousApi;