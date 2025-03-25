import requests from "@/src/api/core/requests";

export interface FileInfo {
    name: string
    size: number
    modTime: string
    path: string
    mode: string
    isDir: boolean
    isLink: boolean
}

export interface Progress {
    total: number
    written: number
    percent: number
    speed: number
}

class FileSystemApi {
    group = "access/filesystem";

    ls = async (sessionId: string, dir: string, hiddenFileVisible: boolean) => {
        return await requests.get(`/${this.group}/${sessionId}/ls?dir=${dir}&hiddenFileVisible=${hiddenFileVisible}`) as FileInfo[];
    }

    rm = async (sessionId: string, filename: string) => {
        await requests.post(`/${this.group}/${sessionId}/rm?filename=${filename}`);
    }

    mkdir = async (sessionId: string, dir: string) => {
        await requests.post(`/${this.group}/${sessionId}/mkdir?dir=${dir}`);
    }

    touch = async (sessionId: string, filename: string) => {
        await requests.post(`/${this.group}/${sessionId}/touch?filename=${filename}`);
    }

    rename = async (sessionId: string, oldName: string, newName: string) => {
        await requests.post(`/${this.group}/${sessionId}/rename?oldName=${oldName}&newName=${newName}`);
    }

    edit = async (sessionId: string, filename: string, fileContent: string) => {
        await requests.post(`/${this.group}/${sessionId}/edit`, {
            filename,
            fileContent
        });
    }

    uploadProgress = async (sessionId: string, filename: string) => {
        let data = await requests.get(`/${this.group}/${sessionId}/upload/progress?filename=${filename}`);
        return data as Progress;
    }
}

const fileSystemApi = new FileSystemApi();
export default fileSystemApi;
