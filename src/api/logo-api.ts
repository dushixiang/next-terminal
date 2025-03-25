import requests from "@/src/api/core/requests";

interface LogoImage {
    name: string;
    data: string;
    deletable: boolean;
}

class LogoApi {
    group = `admin/logos`;

    logos = async () => {
        return await requests.get(`/${this.group}`) as LogoImage[];
    }

    upload = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return await requests.postForm(`/${this.group}/upload`, formData);
    }

    delete = async (name: string) => {
        return await requests.delete(`/${this.group}/${name}`);
    }
}

export const logoApi = new LogoApi();