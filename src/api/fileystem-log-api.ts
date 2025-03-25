import {Api} from "@/src/api/core/api";

export interface FileSystemLog {
    id: string;
    assetId: string;
    sessionId: string;
    userId: string;
    action: string;
    fileName: string;
    createdAt: number;
    assetName: string;
    userName: string;
}

class FileSystemLogApi extends Api<FileSystemLog> {
    constructor() {
        super("admin/filesystem-logs");
    }
}

const fileSystemLogApi = new FileSystemLogApi();
export default fileSystemLogApi;