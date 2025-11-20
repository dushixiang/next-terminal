import {Api} from "@/api/core/api";
import {SessionCommand} from "@/api/session-api";

class SessionCommandApi extends Api<SessionCommand> {
    constructor() {
        super("admin/session-commands");
    }
}

const sessionCommandApi = new SessionCommandApi();
export default sessionCommandApi;