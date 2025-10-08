import {useState, useCallback} from 'react';
import requests, {getToken} from "@/src/api/core/requests";
import fileSystemApi, {FileInfo} from "@/src/api/filesystem-api";
import {getLanguageFromFileName} from "@/src/utils/editor-language";

interface OpenFile {
    key: string
    title: string
    content: string
    changed: boolean
    language: string
}

interface FileEditorState {
    isOpen: boolean
    openFiles: OpenFile[]
    activeFileKey: string
}

// 语言解析函数已提取为公共工具

export function useFileEditor(fsId: string) {
    const [state, setState] = useState<FileEditorState>({
        isOpen: false,
        openFiles: [],
        activeFileKey: ''
    });

    // 打开编辑器
    const openEditor = useCallback(() => {
        setState(prev => ({ ...prev, isOpen: true }));
    }, []);

    // 关闭编辑器
    const closeEditor = useCallback(() => {
        setState(prev => ({ ...prev, isOpen: false }));
    }, []);

    // 打开文件进行编辑
    const openFile = useCallback(async (file: FileInfo) => {
        try {
            const language = getLanguageFromFileName(file.name);
            const fileContent = await requests.get(
                `/${fileSystemApi.group}/${fsId}/download?filename=${file.path}&X-Auth-Token=${getToken()}&t=${new Date().getTime()}`
            );

            const newFile: OpenFile = {
                key: file.path,
                content: fileContent,
                title: file.name,
                language: language || 'text',
                changed: false,
            };

            setState(prev => {
                const existingIndex = prev.openFiles.findIndex(f => f.key === file.path);
                let updatedFiles: OpenFile[];

                if (existingIndex >= 0) {
                    // 更新现有文件
                    updatedFiles = [...prev.openFiles];
                    updatedFiles[existingIndex] = newFile;
                } else {
                    // 添加新文件
                    updatedFiles = [...prev.openFiles, newFile];
                }

                return {
                    ...prev,
                    isOpen: true,
                    openFiles: updatedFiles,
                    activeFileKey: file.path
                };
            });
        } catch (error) {
            console.error('Failed to open file:', error);
            throw error;
        }
    }, [fsId]);

    // 关闭某个已打开的文件
    const closeFile = useCallback((fileKey: string) => {
        setState(prev => {
            const updated = prev.openFiles.filter(f => f.key !== fileKey);
            let nextActive = prev.activeFileKey;
            if (prev.activeFileKey === fileKey) {
                // 如果关闭的是当前活动文件，选取前一个，否则第一个
                const idx = prev.openFiles.findIndex(f => f.key === fileKey);
                if (updated.length === 0) {
                    nextActive = '';
                } else if (idx > 0) {
                    nextActive = updated[idx - 1]?.key || updated[0].key;
                } else {
                    nextActive = updated[0].key;
                }
            }
            return {
                ...prev,
                openFiles: updated,
                activeFileKey: nextActive,
            };
        });
    }, []);

    // 检查是否有打开的文件
    const hasOpenFiles = state.openFiles.length > 0;

    // 获取未保存的文件数量
    const unsavedFilesCount = state.openFiles.filter(file => file.changed).length;

    return {
        ...state,
        hasOpenFiles,
        unsavedFilesCount,
        openEditor,
        closeEditor,
        openFile,
        closeFile,
    };
}

export type {OpenFile};
