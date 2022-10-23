import Api from "../api";

class WorkCommandApi extends Api{
    constructor() {
        super("worker/commands");
    }
}

let workCommandApi = new WorkCommandApi();
export default workCommandApi;