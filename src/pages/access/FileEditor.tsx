import React, {useCallback, useEffect, useState} from 'react';
import {Button, ConfigProvider, Empty, message, Modal, Tabs, theme, Tooltip} from "antd";
import {Copy, RefreshCw, Save, X} from "lucide-react";
import {Editor as MonacoEditor, loader} from '@monaco-editor/react';
import {useTranslation} from "react-i18next";
import copy from "copy-to-clipboard";
import fileSystemApi from "@/src/api/filesystem-api";
import requests, {getToken} from "@/src/api/core/requests";
import {getLanguageFromFileName} from "@/src/utils/editor-language";

// 配置方式
// https://github.com/suren-atoyan/monaco-react/issues/168#issuecomment-762336713
loader.config({ paths: { vs: '/monaco-editor/min/vs' } });

interface OpenFile {
    key: string
    title: string
    content: string
    changed: boolean
    language: string
}

interface Props {
    fsId: string
    open: boolean
    onClose: () => void
    initialFiles?: OpenFile[]
    onCloseFile?: (key: string) => void
}

// 语言解析函数已提取为公共工具

const FileEditor: React.FC<Props> = ({fsId, open, onClose, initialFiles = [], onCloseFile}) => {
    const {t} = useTranslation();
    const [messageApi, messageContextHolder] = message.useMessage();

    const [openFiles, setOpenFiles] = useState<OpenFile[]>(initialFiles);
    const [activeFileKey, setActiveFileKey] = useState<string>('');
    const [editorSaving, setEditorSaving] = useState<boolean>(false);

    // 初始化文件
    useEffect(() => {
        // 将父级的 initialFiles 作为真源，合并本地状态（保留未保存的改动）
        setOpenFiles(prevFiles => {
            const prevMap = new Map(prevFiles.map(f => [f.key, f] as const));
            const nextFiles: OpenFile[] = initialFiles.map(f => {
                const prev = prevMap.get(f.key);
                if (prev && prev.changed) {
                    return prev; // 保留本地未保存的内容
                }
                return f;
            });

            // 若有新文件追加，则激活最新追加的那个
            const prevKeys = new Set(prevFiles.map(f => f.key));
            const newAdded = initialFiles.filter(f => !prevKeys.has(f.key));
            if (newAdded.length > 0) {
                setActiveFileKey(newAdded[newAdded.length - 1].key);
            } else if (!initialFiles.find(f => f.key === activeFileKey)) {
                // 若当前激活文件已不存在，切换到第一个或清空
                setActiveFileKey(initialFiles[0]?.key || '');
            }
            return nextFiles;
        });
    }, [initialFiles]);

    // 获取当前活动文件的索引
    const activeFileIndex = openFiles.findIndex(file => file.key === activeFileKey);
    const activeFile = openFiles[activeFileIndex];

    // 获取文件内容
    const fetchFile = useCallback(async (key: string, title: string) => {
        messageApi.loading({key: key, content: 'Loading'});
        try {
            const language = getLanguageFromFileName(title);
            const fileContent = await requests.get(`/${fileSystemApi.group}/${fsId}/download?filename=${key}&X-Auth-Token=${getToken()}&t=${new Date().getTime()}`);

            setOpenFiles(prevFiles => {
                const existingIndex = prevFiles.findIndex(file => file.key === key);
                const newFile: OpenFile = {
                    key,
                    content: fileContent,
                    title,
                    language: language || 'text',
                    changed: false,
                };

                if (existingIndex >= 0) {
                    // 更新现有文件
                    const updatedFiles = [...prevFiles];
                    updatedFiles[existingIndex] = newFile;
                    return updatedFiles;
                } else {
                    // 添加新文件
                    return [...prevFiles, newFile];
                }
            });

            messageApi.destroy(key);
            setActiveFileKey(key);
        } catch (error) {
            messageApi.error(`Failed to load file: ${error.message}`);
            messageApi.destroy(key);
        }
    }, [fsId, messageApi]);

    // 保存文件
    const handleSaveFile = useCallback(async () => {
        if (!activeFile) return;

        setEditorSaving(true);
        try {
            await fileSystemApi.edit(fsId, activeFile.key, activeFile.content);
            message.success(t('general.success'));

            // 更新文件状态为未修改
            setOpenFiles(prevFiles =>
                prevFiles.map(file =>
                    file.key === activeFile.key
                        ? {...file, changed: false}
                        : file
                )
            );
        } catch (error) {
            message.error(`Failed to save file: ${error.message}`);
        } finally {
            setEditorSaving(false);
        }
    }, [activeFile, fsId, t]);

    // 重新加载文件
    const handleRefreshFile = useCallback(async () => {
        if (!activeFile) return;
        await fetchFile(activeFile.key, activeFile.title);
    }, [activeFile, fetchFile]);

    // 关闭文件
    const handleCloseFile = useCallback((fileKey: string) => {
        setOpenFiles(prevFiles => {
            const updatedFiles = prevFiles.filter(file => file.key !== fileKey);

            // 如果关闭的是当前活动文件，需要切换到其他文件
            if (fileKey === activeFileKey) {
                if (updatedFiles.length > 0) {
                    const currentIndex = prevFiles.findIndex(file => file.key === fileKey);
                    const nextIndex = currentIndex > 0 ? currentIndex - 1 : 0;
                    setActiveFileKey(updatedFiles[nextIndex]?.key || '');
                } else {
                    setActiveFileKey('');
                }
            }

            return updatedFiles;
        });
        // 通知父级移除此文件，避免后续 props 变更时再次注入
        if (typeof onCloseFile === 'function') {
            onCloseFile(fileKey);
        }
    }, [activeFileKey, onCloseFile]);

    // 更新文件内容
    const handleFileContentChange = useCallback((newContent: string) => {
        if (activeFileIndex === -1) return;

        setOpenFiles(prevFiles =>
            prevFiles.map((file, index) =>
                index === activeFileIndex
                    ? {...file, content: newContent, changed: true}
                    : file
            )
        );
    }, [activeFileIndex]);

    // 键盘快捷键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSaveFile();
            }
        };

        if (open) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, handleSaveFile]);

    // 生成标签页项目
    const tabItems = openFiles.map((item) => {
        return {
            key: item.key,
            label: (
                <div className="flex items-center gap-2 px-2 py-1">
                    <span className="text-xs font-medium truncate max-w-[140px]">
                        {item.changed ? '• ' : ''}{item.title}
                    </span>
                    <X
                        className="h-3 w-3 text-gray-400 hover:text-red-400"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCloseFile(item.key);
                        }}
                    />
                </div>
            ),
            children: (
                <div className="h-full">
                    <MonacoEditor
                        language={item.language}
                        height={window.innerHeight * 0.7}
                        theme="vs-dark"
                        value={item.content}
                        options={{
                            selectOnLineNumbers: true,
                            fontSize: 12,
                            lineHeight: 1.4,
                            fontFamily: "Monaco, Menlo, Consolas, 'Courier New', monospace",
                            minimap: {enabled: false},
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            smoothScrolling: true,
                            padding: {top: 8, bottom: 8},
                        }}
                        loading={editorSaving}
                        onMount={(editor) => {
                            editor.focus();
                        }}
                        onChange={(newValue) => {
                            if (newValue !== undefined) {
                                handleFileContentChange(newValue);
                            }
                        }}
                    />
                </div>
            ),
        };
    });

    const handleClose = () => {
        // 检查是否有未保存的文件
        const hasUnsavedFiles = openFiles.some(file => file.changed);
        if (hasUnsavedFiles) {
            Modal.confirm({
                title: t('fs.editor.unsaved_changes_title'),
                content: t('fs.editor.unsaved_changes_content'),
                onOk: () => {
                    onClose();
                },
            });
        } else {
            onClose();
        }
    };

     const title = <div className="flex items-center">
        <Tooltip title={`${t('fs.editor.save')} (Ctrl+S)`}>
            <Button
                type="text"
                size="small"
                icon={<Save className="h-3 w-3"/>}
                loading={editorSaving}
                onClick={handleSaveFile}
                disabled={!activeFile?.changed}
            >
                {t('fs.editor.save')}
            </Button>
        </Tooltip>
        <Tooltip title={t('fs.editor.refetch')}>
            <Button
                type="text"
                size="small"
                icon={<RefreshCw className="h-3 w-3"/>}
                onClick={handleRefreshFile}
                disabled={!activeFile}
            >
                {t('fs.editor.refetch')}
            </Button>
        </Tooltip>
         {activeFile && (
             <Tooltip title={t('fs.editor.copy_path')}>
                 <Button
                     type="text"
                     size="small"
                     icon={<Copy className="h-3 w-3"/>}
                     onClick={() => {
                         copy(activeFile.key);
                         message.success(t('general.copy_success'));
                     }}
                 >
                     {t('fs.editor.copy_path')}
                 </Button>
             </Tooltip>
         )}
    </div>

    return (
        <>
            <ConfigProvider theme={{algorithm: theme.darkAlgorithm}}>
                <Modal
                    title={title}
                    open={open}
                    width={window.innerWidth * 0.8}
                    centered={true}
                    onCancel={handleClose}
                    footer={false}
                    destroyOnHidden={true}
                    styles={{body: {padding: 0}}}
                >
                    <div className="h-full flex flex-col">
                        <div className={'w-full h-1 border-b'}></div>
                        <div className="flex-1 min-h-0">
                            {tabItems.length > 0 ? (
                                <Tabs
                                    activeKey={activeFileKey}
                                    items={tabItems}
                                    onChange={setActiveFileKey}
                                    hideAdd
                                    tabBarGutter={4}
                                    tabBarStyle={{margin: 0, padding: '0 8px'}}
                                    size="small"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <Empty description={t('fs.editor.no_files_open')}/>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            </ConfigProvider>
            {messageContextHolder}

            <style dangerouslySetInnerHTML={{
                __html: `
                    .editor-tabs .ant-tabs-tab {
                        background: transparent !important;
                        border: none !important;
                        padding: 8px 4px !important;
                        margin: 0 2px !important;
                    }
                    
                    .editor-tabs .ant-tabs-tab:hover {
                        background: rgba(51, 65, 85, 0.5) !important;
                    }
                    
                    .editor-tabs .ant-tabs-tab-active {
                        background: rgba(71, 85, 105, 0.5) !important;
                        border-bottom: 2px solid #3b82f6 !important;
                    }
                    
                    .editor-tabs .ant-tabs-content-holder {
                        background: #1e1e1e;
                        height: calc(100vh - 200px);
                    }
                    
                    .editor-tabs .ant-tabs-tabpane {
                        height: 100%;
                        padding: 0;
                    }
                    
                    .editor-tabs .ant-tabs-nav {
                        margin-bottom: 0 !important;
                    }
                `
            }}/>
        </>
    );
};

export default FileEditor;
