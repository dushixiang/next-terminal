import {Api} from "./core/api";

export interface Snippet {
    id: string;
    name: string;
    content: string;
    visibility: 'public' | 'private';
    createdBy: string;
    createdAt: number;
}

class SnippetApi extends Api<Snippet>{
    constructor() {
        super("admin/snippets");
    }
}

let snippetApi = new SnippetApi();
export default snippetApi;