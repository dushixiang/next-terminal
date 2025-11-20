import requests from "@/api/core/requests";
import fileSystemApi from "@/api/filesystem-api";

/**
 * 下载文件内容
 * @param fsId 文件系统ID
 * @param filePath 文件路径
 * @returns 文件内容
 */
export async function downloadFileContent(fsId: string, filePath: string): Promise<string> {
    // 对文件路径进行URL编码，避免特殊字符导致请求失败
    const fileContent = await requests.get(
        `/${fileSystemApi.group}/${fsId}/download?filename=${encodeURIComponent(filePath)}&t=${Date.now()}`
    );
    return fileContent;
}

