import {Api} from "./core/api";
import {Snippet} from "@/src/api/snippet-api";

class SnippetUserApi extends Api<Snippet>{
    constructor() {
        super("portal/snippets");
    }
}

let snippetUserApi = new SnippetUserApi();
export default snippetUserApi;