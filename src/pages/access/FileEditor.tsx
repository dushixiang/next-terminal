import React, {useEffect, useState} from 'react';
import {App, Button, ConfigProvider, Empty, Modal, Tabs, theme, Tooltip} from "antd";
import {Copy, RefreshCw, Save, X} from "lucide-react";
import {Editor as MonacoEditor, loader} from '@monaco-editor/react';
import {useTranslation} from "react-i18next";
import copy from "copy-to-clipboard";
import fileSystemApi from "@/api/filesystem-api";
import {OpenFile} from "@/pages/access/hooks/use-file-editor";
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === 'json') {
            return new jsonWorker();
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return new cssWorker();
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return new htmlWorker();
        }
        if (label === 'typescript' || label === 'javascript') {
            return new tsWorker();
        }
        return new editorWorker();
    },
};

loader.config({monaco});

loader.init().then(() => {
    console.log('monaco init success')
}).catch((error) => {
    console.error('monaco init error', error);
});

interface Props {
    fsId: string
    open: boolean
    onClose: () => void
    openFiles: OpenFile[]
    activeFileKey: string
    onActiveFileChange: (key: string) => void
    onFileContentChange: (key: string, content: string) => void
    onFileSaved: (key: string) => void
    onCloseFile?: (key: string) => void
    onRefreshFile?: (key: string) => void
}

// 语言解析函数已提取为公共工具
const FileEditor: React.FC<Props> = ({
                                         fsId,
                                         open,
                                         onClose,
                                         openFiles,
                                         activeFileKey,
                                         onActiveFileChange,
                                         onFileContentChange,
                                         onFileSaved,
                                         onCloseFile,
                                         onRefreshFile
                                     }) => {
    const {t} = useTranslation();
    let {message} = App.useApp();

    const [editorSaving, setEditorSaving] = useState<boolean>(false);

    // 获取当前活动文件
    const activeFile = openFiles.find(f => f.key === activeFileKey);

    // 保存文件
    const handleSaveFile = async () => {
        // 修复：防止重复请求
        if (!activeFile || editorSaving) return;

        setEditorSaving(true);
        try {
            await fileSystemApi.edit(fsId, activeFile.key, activeFile.content);
            message.success(t('general.success'));

            // 通知父级标记文件为已保存
            onFileSaved(activeFile.key);
        } catch (error) {
            message.error(`Failed to save file: ${error.message}`);
        } finally {
            setEditorSaving(false);
        }
    };

    // 重新加载文件
    const handleRefreshFile = async () => {
        if (!activeFile || !onRefreshFile) return;
        onRefreshFile(activeFile.key);
    };

    // 关闭文件
    const handleCloseFile = (fileKey: string) => {
        // 通知父级关闭文件
        if (typeof onCloseFile === 'function') {
            onCloseFile(fileKey);
        }
    };

    // 更新文件内容
    const handleFileContentChange = (newContent: string) => {
        if (!activeFile) return;
        onFileContentChange(activeFile.key, newContent);
    };

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
                            minimap: {enabled: true},
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
        onClose();
    };

    const title = <div className="flex items-center">
        <Tooltip title={`${t('actions.save')} (Ctrl+S)`}>
            <Button
                type="text"
                size="small"
                icon={<Save className="h-3 w-3"/>}
                loading={editorSaving}
                onClick={handleSaveFile}
                disabled={!activeFile?.changed}
            >
                {t('actions.save')}
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
                    styles={{body: {padding: 0}}}
                >
                    <div className="h-full flex flex-col">
                        <div className={'w-full h-1 border-b border-[#303030]'}></div>
                        <div className="flex-1">
                            {tabItems.length > 0 ? (
                                <Tabs
                                    activeKey={activeFileKey}
                                    items={tabItems}
                                    onChange={onActiveFileChange}
                                    hideAdd
                                    tabBarGutter={4}
                                    tabBarStyle={{margin: 0, padding: '0 8px'}}
                                    size="small"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-[70vh]">
                                    <Empty description={t('fs.editor.no_files_open')}/>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            </ConfigProvider>
        </>
    );
};

export default FileEditor;
