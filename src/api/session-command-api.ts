import {Api} from "@/src/api/core/api";
import {SessionCommand} from "@/src/api/session-api";

class SessionCommandApi extends Api<SessionCommand> {
    constructor() {
        super("admin/session-commands");
    }
}

const sessionCommandApi = new SessionCommandApi();
export default sessionCommandApi;