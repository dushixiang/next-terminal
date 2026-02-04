import {useState} from 'react';
import fileSystemApi, {FileInfo} from "@/api/filesystem-api";
import {getLanguageFromFileName} from "@/utils/editor-language";
import {downloadFileContent} from "@/utils/filesystem-utils";

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
    const openEditor = () => {
        setState(prev => ({...prev, isOpen: true}));
    };

    // 关闭编辑器
    const closeEditor = () => {
        setState(prev => ({...prev, isOpen: false}));
    };

    // 打开文件进行编辑
    const openFile = async (file: FileInfo) => {
        try {
            const language = getLanguageFromFileName(file.name);
            // 使用公共工具函数下载文件
            const fileContent = await downloadFileContent(fsId, file.path);

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
    };

    // 关闭某个已打开的文件
    const closeFile = (fileKey: string) => {
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
    };

    // 切换活动文件
    const setActiveFile = (fileKey: string) => {
        setState(prev => ({
            ...prev,
            activeFileKey: fileKey
        }));
    };

    // 更新文件内容
    const updateFileContent = (fileKey: string, content: string) => {
        setState(prev => ({
            ...prev,
            openFiles: prev.openFiles.map(file =>
                file.key === fileKey
                    ? {...file, content, changed: true}
                    : file
            )
        }));
    };

    // 标记文件为已保存（清除changed标记）
    const markFileSaved = (fileKey: string) => {
        setState(prev => ({
            ...prev,
            openFiles: prev.openFiles.map(file =>
                file.key === fileKey
                    ? {...file, changed: false}
                    : file
            )
        }));
    };

    // 刷新文件（重新从服务器加载）
    const refreshFile = async (fileKey: string) => {
        const file = state.openFiles.find(f => f.key === fileKey);
        if (!file) return;

        try {
            const language = getLanguageFromFileName(file.title);
            const fileContent = await downloadFileContent(fsId, fileKey);

            setState(prev => ({
                ...prev,
                openFiles: prev.openFiles.map(f =>
                    f.key === fileKey
                        ? {...f, content: fileContent, language: language || 'text', changed: false}
                        : f
                )
            }));
        } catch (error) {
            console.error('Failed to refresh file:', error);
            throw error;
        }
    };

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
        setActiveFile,
        updateFileContent,
        markFileSaved,
        refreshFile,
    };
}

export type {OpenFile};
