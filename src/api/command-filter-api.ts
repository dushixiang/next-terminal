import {Api} from "@/src/api/core/api";
import requests from "@/src/api/core/requests";

export interface CommandFilter {
    id: string;
    name: string;
    createdAt: number;
}

class CommandFilterApi extends Api<CommandFilter>{

    constructor() {
        super("admin/command-filters");
    }

    Bind = async (id: string, data: any) => {
        await requests.post(`/${this.group}/${id}/bind`, data)
    }

    Unbind = async (id: string, data: any) => {
        await requests.post(`/${this.group}/${id}/unbind`, data);
    }
}

const commandFilterApi = new CommandFilterApi();
export default commandFilterApi;