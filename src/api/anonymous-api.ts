import requests from "@/src/api/core/requests";
import {Strategy} from "@/src/api/strategy-api";
import {SessionWatermark} from "@/src/api/session-api";

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