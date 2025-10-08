import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback, useMemo, useReducer} from 'react';
import {
    Button,
    Col,
    ConfigProvider,
    Drawer,
    Dropdown,
    Empty,
    FloatButton,
    Input,
    MenuProps,
    message,
    Modal,
    Progress,
    Row,
    Space,
    Table,
    Tabs,
    Tag,
    theme,
    Tooltip
} from "antd";
import {
    Download,
    DownloadIcon,
    File,
    FileArchive,
    FileEdit,
    FileImage,
    FileJson,
    FilePlus2Icon,
    FileText,
    FileUpIcon,
    Folder,
    FolderEdit,
    FolderUpIcon,
    Link,
    Trash2Icon,
    TrashIcon,
    Undo2,
    X,
    XCircle
} from "lucide-react";
import {ColumnsType} from "antd/es/table";
import {browserDownload, generateRandomId, renderSize} from "@/src/utils/utils";
import {useQuery} from "@tanstack/react-query";
import dayjs from "dayjs";
import strings from "@/src/utils/strings";
import {useTranslation} from "react-i18next";
import requests, {baseUrl, getToken} from "@/src/api/core/requests";
import {useList} from "react-use";
import PromptModal from "@/src/components/PromptModal";
import FileEditor from "@/src/pages/access/FileEditor";
import {useFileEditor} from "@/src/hook/use-file-editor";
import fileSystemApi, {FileInfo} from "@/src/api/filesystem-api";
import {EyeInvisibleOutlined, EyeOutlined, LineOutlined, ReloadOutlined, SyncOutlined} from "@ant-design/icons";
import copy from "copy-to-clipboard";
import clsx from "clsx";
import {ScrollArea} from "@/components/ui/scroll-area";
import {cn} from "@/lib/utils";
import {Strategy} from "@/src/api/strategy-api";
import {Base64} from 'js-base64';
import {useLicense} from "@/src/hook/use-license";

declare module 'react' {
    interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
        // extends React's HTMLAttributes
        directory?: string;
        webkitdirectory?: string;
    }
}

export interface FileSystem {
    changeDir(s: string): void
}

interface Props {
    fsId: string
    strategy?: Strategy
    open: boolean
    onClose: () => void
    mask?: boolean
    maskClosable?: boolean
}

interface TransmissionRecord {
    id: string,
    path: string,
    name: string,
    loaded: number,
    size: number,
    percent: number,
    status: "preparing" | "uploading" | "transmitting" | "success" | "error" | "cancelled",
    error: string,
    speed: number,
    xhr?: XMLHttpRequest,
    intervalId?: NodeJS.Timeout,
}


interface PromptState {
    type: "create-dir" | "create-file" | "rename" | undefined
    value: string
    open: boolean
    loading: boolean
}

interface ContextMenu {
    pageX: number,
    pageY: number,
    file: FileInfo,
}

// 传输记录的 reducer
type TransmissionAction = 
    | { type: 'ADD_RECORDS'; records: TransmissionRecord[] }
    | { type: 'UPDATE_RECORD'; id: string; updates: Partial<TransmissionRecord> }
    | { type: 'REMOVE_RECORD'; id: string }
    | { type: 'CLEAR_COMPLETED' }
    | { type: 'CANCEL_UPLOAD'; id: string };

function transmissionReducer(state: TransmissionRecord[], action: TransmissionAction): TransmissionRecord[] {
    switch (action.type) {
        case 'ADD_RECORDS':
            return [...state, ...action.records];
        case 'UPDATE_RECORD':
            return state.map(record => 
                record.id === action.id ? { ...record, ...action.updates } : record
            );
        case 'REMOVE_RECORD':
            return state.filter(record => record.id !== action.id);
        case 'CLEAR_COMPLETED':
            // 清除已完成的记录，但保留上传中和传输中的
            return state.filter(record => 
                record.status === 'uploading' || 
                record.status === 'transmitting' || 
                record.status === 'preparing'
            );
        case 'CANCEL_UPLOAD':
            return state.map(record => {
                if (record.id === action.id) {
                    // 取消上传
                    if (record.xhr) {
                        record.xhr.abort();
                    }
                    if (record.intervalId) {
                        clearInterval(record.intervalId);
                    }
                    return { ...record, status: 'cancelled' as const, speed: 0 };
                }
                return record;
            });
        default:
            return state;
    }
}

const iconClassName = 'h-4 w-4'

function getFileIconFromFileName(fileName: string) {
    let icon = <File className={iconClassName}/>
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case "bmp":
        case "jpg":
        case "jpeg":
        case "png":
        case "tif":
        case "gif":
        case "pcx":
        case "tga":
        case "exif":
        case "svg":
        case "psd":
        case "ai":
        case "webp":
            icon = <FileImage className={iconClassName}/>;
            break;
        case "doc":
        case "docx":
        case "xls":
        case "xlsx":
        case "md":
        case "pdf":
        case "txt":
            icon = <FileText className={iconClassName}/>;
            break;
        case "zip":
        case "gz":
        case "tar":
        case "tgz":
            icon = <FileArchive className={iconClassName}/>;
            break;
        case "json":
            icon = <FileJson className={clsx(iconClassName)}/>
            break;
    }
    return icon;
}


const FileSystemPage = forwardRef<FileSystem, Props>(({
                                                          fsId,
                                                          strategy,
                                                          open,
                                                          onClose,
                                                          mask,
                                                          maskClosable
                                                      }: Props, ref) => {

    let {t} = useTranslation();

    let fileUploadRef = useRef<HTMLInputElement>();
    let dirUploadRef = useRef<HTMLInputElement>();

    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    let [currentDirectory, setCurrentDirectory] = useState('/');
    let [currentDirectoryForInput, setCurrentDirectoryForInput] = useState(currentDirectory);
    let [files, setFiles] = useState<FileInfo[]>([]);
    let [hiddenFileVisible, setHiddenFileVisible] = useState<boolean>(false);

    const [transmissionRecords, transmissionDispatch] = useReducer(transmissionReducer, []);

    let [uploading, setUploading] = useState(false);
    let [fileTransmitterOpen, setFileTransmitterOpen] = useState(false);

    let [promptState, setPromptState] = useState<PromptState>({
        loading: false, value: "", open: false, type: undefined
    });

    const fileEditor = useFileEditor(fsId);

    const [modal, contextHolder] = Modal.useModal();
    const [messageApi, messageContextHolder] = message.useMessage();
    const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
    let [license] = useLicense();

    let editLabel = t('fs.operations.edit');
    if (license.isFree()) {
        editLabel += ` (${t('settings.license.type.options.premium')})`;
    }

    const items: MenuProps['items'] = [
        {
            label: editLabel,
            key: 'edit',
            icon: <FileEdit className={iconClassName}/>,
            disabled: contextMenu?.file?.isDir || license.isFree(),
            onClick: async () => {
                let file = contextMenu.file;
                try {
                    await fileEditor.openFile(file);
                } catch (error) {
                    messageApi.error(`Failed to open file: ${error.message}`);
                }
            },
        },
        {
            label: t('fs.operations.download'),
            key: 'download',
            icon: <Download className={iconClassName}/>,
            disabled: contextMenu?.file?.isDir,
            onClick: () => {
                let file = contextMenu.file;
                let url = `${baseUrl()}/${fileSystemApi.group}/${fsId}/download?filename=${file.path}&X-Auth-Token=${getToken()}`;
                browserDownload(url);
            },
        },
        {
            label: t('fs.operations.rename'),
            key: 'rename',
            icon: <FolderEdit className={iconClassName}/>,
            onClick: () => {
                let file = contextMenu.file;
                setPromptState({
                    loading: false, open: true, type: "rename", value: file.name
                })
            },
        },
        {
            type: 'divider',
        },
        {
            label: t('fs.operations.remove'),
            key: 'delete',
            danger: true,
            icon: <TrashIcon className={iconClassName}/>,
            onClick: () => {
                let keys = [contextMenu.file?.path];
                setSelectedRowKeys(keys);
                handleDeleteFile(keys);
            },
        },
    ];

    if (ref) {
        useImperativeHandle(ref, () => ({
            changeDir: (s: string) => setCurrentDirectory(s),
        }));
    }

    let filesQuery = useQuery({
        queryKey: ['files'],
        enabled: open,
        retry: 0,
        queryFn: () => {
            return fileSystemApi.ls(fsId, currentDirectory, hiddenFileVisible);
        }
    });

    useEffect(() => {
        if (open) {
            setCurrentDirectoryForInput(currentDirectory);
            filesQuery.refetch();
            return
        }
    }, [hiddenFileVisible, currentDirectory, open]);

    useEffect(() => {
        if (!open) {
            setCurrentDirectory('/');
            setSelectedRowKeys([]);
        }
    }, [fsId]);

    useEffect(() => {
        if (!filesQuery.data) {
            return
        }
        setFiles(filesQuery.data);
    }, [filesQuery.data]);

    const renderFileIcon = (file: FileInfo) => {
        if (file.isDir) {
            return <Folder color={'#4096ff'} className={iconClassName}/>
        } else if (file.isLink) {
            return <Link className={iconClassName}/>
        } else {
            return getFileIconFromFileName(file.name);
        }
    }

    const fileColumns: ColumnsType<FileInfo> = [
        {
            title: t('fs.attributes.path'),
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => {
                return a.name?.localeCompare(b.name);
            },
            render: (value, file) => {
                let name = file.name
                if (name.length > 24) {
                    name = name.substring(0, 24) + '...'
                }
                return <Space size={'small'}>
                    {renderFileIcon(file)}<Tooltip title={file.name}>{name}</Tooltip>
                </Space>
            },
            sortDirections: ['descend', 'ascend'],
        },
        {
            title: t('fs.attributes.size'),
            dataIndex: 'size',
            key: 'size',
            width: 100,
            render: (value, item, index) => {
                if (item.isDir) {
                    return '-';
                }
                return renderSize(value);
            },
            sorter: (a, b) => {
                return a.size - b.size;
            },
        }, {
            title: t('fs.attributes.last.modified'),
            dataIndex: 'modTime',
            key: 'modTime',
            width: 180,
            sorter: (a, b) => {
                return a.modTime - b.modTime;
            },
            sortDirections: ['descend', 'ascend'],
            render: (value, item) => {
                return <span>{dayjs(value).format(`YYYY-MM-DD HH:mm:ss`)}</span>;
            },
        }, {
            title: t('fs.attributes.permissions.label'),
            dataIndex: 'mode',
            key: 'mode',
            width: 100,
            render: (value, item) => {
                return <span className={'dode'}>{value}</span>;
            },
        },
    ];

    const tranColumns: ColumnsType<TransmissionRecord> = [
        {
            title: t('fs.transmission.filename'),
            dataIndex: 'name',
            key: 'name',
            ellipsis: true,
            render: (text, record) => (
                <Tooltip title={record.path}>
                    {text}
                </Tooltip>
            ),
        },
        {
            title: t('fs.transmission.size'),
            dataIndex: 'size',
            key: 'size',
            render: (value, item) => {
                return renderSize(value);
            },
            width: 80,
        },
        {
            title: t('fs.transmission.status'),
            dataIndex: 'status',
            key: 'status',
            render: (v, item) => {
                switch (v) {
                    case 'preparing':
                        return <Tag color={'default'}>{t('fs.transmission.options.preparing')}</Tag>;
                    case 'uploading':
                        return <Tag color={'processing'}>{t('fs.transmission.options.uploading')}</Tag>;
                    case 'transmitting':
                        return <Tag color={'processing'}>{t('fs.transmission.options.transmitting')}</Tag>;
                    case 'success':
                        return <Tag color={'success'}>{t('fs.transmission.options.upload_success')}</Tag>
                    case 'cancelled':
                        return <Tag color={'warning'}>{t('fs.transmission.options.cancelled')}</Tag>
                    case 'error':
                        return <Tooltip title={item.error}>
                            <Tag color={'error'}>{t('fs.transmission.options.upload_failed')}</Tag>
                        </Tooltip>
                }
            },
            width: 100,
        },
        {
            title: t('fs.transmission.progress'),
            dataIndex: 'percent',
            key: 'percent',
            render: (v, record) => (
                <Progress
                    percent={record.percent}
                    size="small"
                    status={record.status === 'error' ? 'exception' :
                        record.status === 'success' ? 'success' : 'active'}
                    format={(percent) => `${percent?.toFixed(1)}%`}
                    style={{ width: 80 }}
                />
            ),
            width: 120,
        },
        {
            title: t('fs.transmission.speed'),
            dataIndex: 'speed',
            key: 'speed',
            render: (v) => {
                return (
                    <span className="text-xs whitespace-nowrap">
                        {v > 0 ? `${renderSize(v, 0)}/s` : '-'}
                    </span>
                );
            },
            width: 90,
        },
        {
            title: t('actions.label'),
            key: 'actions',
            width: 60,
            render: (_, record) => (
                <div className="flex gap-1">
                    {(record.status === 'uploading' || record.status === 'transmitting') && (
                        <Tooltip title={t('actions.cancel')}>
                            <Button
                                type="text"
                                size="small"
                                icon={<XCircle className="h-3 w-3" />}
                                onClick={() => transmissionDispatch({ type: 'CANCEL_UPLOAD', id: record.id })}
                            />
                        </Tooltip>
                    )}
                    {(record.status === 'success' || record.status === 'error' || record.status === 'cancelled') && (
                        <Tooltip title={t('actions.remove')}>
                            <Button
                                type="text"
                                size="small"
                                icon={<X className="h-3 w-3" />}
                                onClick={() => transmissionDispatch({ type: 'REMOVE_RECORD', id: record.id })}
                            />
                        </Tooltip>
                    )}
                </div>
            ),
        },
    ];

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys as string[]);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        columnWidth: 40,
    };
    const hasSelected = selectedRowKeys.length > 0;

    const rollback = () => {
        let number = currentDirectory.lastIndexOf('/');
        let path = currentDirectory.substring(0, number);
        if (!strings.hasText(path)) {
            path = '/';
        }
        setCurrentDirectory(path);
    }

    const getFileKey = (file: File) => {
        if (strings.hasText(file.webkitRelativePath)) {
            return file.webkitRelativePath;
        }
        return file.name;
    }

    const getFileName = (file: File) => {
        if (strings.hasText(file.webkitRelativePath)) {
            return file.webkitRelativePath;
        }
        return file.name;
    }

    // 重构的上传函数，修复进度显示bug
    const uploadFile = useCallback(async (id: string, file: File, dir: string, fsId: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const { size } = file;
            const name = getFileName(file);
            const url = `${baseUrl()}/${fileSystemApi.group}/${fsId}/upload?X-Auth-Token=${getToken()}&dir=${dir}&id=${id}`;

            const xhr = new XMLHttpRequest();
            let intervalId: NodeJS.Timeout | undefined;
            
            // 保存 xhr 和 intervalId 到记录中，用于取消操作
            transmissionDispatch({
                type: 'UPDATE_RECORD',
                id,
                updates: { xhr, intervalId }
            });

            let prevTime = Date.now();
            let prevLoaded = 0;
            let hasStartedBackendPolling = false;

            xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable) {
                    return;
                }

                const currentTime = Date.now();
                const elapsedTime = Math.max((currentTime - prevTime) / 1000, 0.1); // 避免除零
                const loaded = event.loaded;
                const speed = Math.max((loaded - prevLoaded) / elapsedTime, 0);

                // 计算前端上传进度，最大99%
                let percent = Math.min((event.loaded * 100 / event.total), 99);
                percent = Math.max(Number(percent.toFixed(2)), 0);

                transmissionDispatch({
                    type: 'UPDATE_RECORD',
                    id,
                    updates: {
                        loaded: event.loaded,
                        size,
                        percent,
                        status: "uploading",
                        error: "",
                        speed
                    }
                });

                // 当前端上传完成时，开始后端处理阶段
                if (event.loaded === event.total && !hasStartedBackendPolling) {
                    hasStartedBackendPolling = true;
                    
                    transmissionDispatch({
                        type: 'UPDATE_RECORD',
                        id,
                        updates: {
                            status: "transmitting",
                            percent: 99,
                            speed: 0
                        }
                    });

                    // 开始轮询后端进度，无延迟
                    let retryCount = 0;
                    const maxRetries = 10; // 最多重试10次（5秒）
                    
                    intervalId = setInterval(async () => {
                        try {
                            const progress = await fileSystemApi.uploadProgress(fsId, id);
                            console.log('Upload progress polling result:', progress);
                            
                            // 如果返回-1，可能是后端还没准备好，重试几次
                            if (progress.total === -1) {
                                retryCount++;
                                console.log(`Upload progress not found, retry count: ${retryCount}/${maxRetries}`);
                                if (retryCount >= maxRetries) {
                                    // 重试次数过多，认为上传失败
                                    console.error('Upload progress not found after max retries');
                                    clearInterval(intervalId);
                                    transmissionDispatch({
                                        type: 'UPDATE_RECORD',
                                        id,
                                        updates: {
                                            status: "error",
                                            error: "Upload progress not found after retries",
                                            speed: 0
                                        }
                                    });
                                }
                                return;
                            }
                            
                            // 重置重试计数
                            retryCount = 0;
                            
                            transmissionDispatch({
                                type: 'UPDATE_RECORD',
                                id,
                                updates: {
                                    loaded: progress.written,
                                    percent: Math.min(progress.percent, 100),
                                    speed: progress.speed || 0
                                }
                            });

                            // 检查是否完成
                            if (progress.isCompleted || progress.percent >= 100) {
                                console.log('Upload completed via progress polling');
                                clearInterval(intervalId);
                                transmissionDispatch({
                                    type: 'UPDATE_RECORD',
                                    id,
                                    updates: {
                                        status: "success",
                                        percent: 100,
                                        speed: 0,
                                        error: ""
                                    }
                                });
                            }
                        } catch (error) {
                            console.error('Failed to fetch upload progress:', error);
                            retryCount++;
                            if (retryCount >= maxRetries) {
                                console.error('Upload progress polling failed after max retries');
                                clearInterval(intervalId);
                                transmissionDispatch({
                                    type: 'UPDATE_RECORD',
                                    id,
                                    updates: {
                                        status: "error",
                                        error: "Failed to fetch upload progress",
                                        speed: 0
                                    }
                                });
                            }
                        }
                    }, 500);
                    
                    // 保存更新后的 intervalId
                    transmissionDispatch({
                        type: 'UPDATE_RECORD',
                        id,
                        updates: { intervalId }
                    });
                }

                prevTime = currentTime;
                prevLoaded = loaded;
            };

            xhr.onreadystatechange = () => {
                if (xhr.readyState !== 4) {
                    return;
                }

                console.log(`Upload response - Status: ${xhr.status}, Response: ${xhr.responseText}`);

                if (xhr.status >= 200 && xhr.status < 300) {
                    // 检查响应体是否包含错误信息
                    let hasError = false;
                    let errorMessage = '';
                    
                    try {
                        const responseText = xhr.responseText;
                        if (responseText) {
                            const result = JSON.parse(responseText);
                            console.log('Upload response parsed:', result);
                            
                            // 检查是否是标准错误响应格式
                            if (result.error === true || (result.message && result.code)) {
                                hasError = true;
                                errorMessage = result.message || 'Upload failed';
                                console.error('Upload failed with parsed error:', errorMessage);
                            }
                        }
                    } catch (e) {
                        // JSON解析失败，可能是成功的空响应，继续处理为成功
                        console.log('Upload response parse failed, treating as success:', e);
                    }
                    
                    if (hasError) {
                        // 虽然HTTP状态码是200，但响应内容表示失败
                        if (intervalId) {
                            clearInterval(intervalId);
                        }
                        
                        transmissionDispatch({
                            type: 'UPDATE_RECORD',
                            id,
                            updates: {
                                status: "error",
                                error: errorMessage,
                                speed: 0
                            }
                        });

                        console.error('Upload marked as error:', errorMessage);
                        reject(new Error(errorMessage));
                    } else {
                        // 真正成功
                        console.log('Upload marked as success');
                        if (!hasStartedBackendPolling) {
                            transmissionDispatch({
                                type: 'UPDATE_RECORD',
                                id,
                                updates: {
                                    loaded: size,
                                    size,
                                    percent: 100,
                                    status: "success",
                                    error: "",
                                    speed: 0
                                }
                            });
                        }
                        resolve();
                    }
                } else {
                    // 处理HTTP错误状态码
                    if (intervalId) {
                        clearInterval(intervalId);
                    }
                    
                    let errorMessage = `Upload failed with status code: ${xhr.status}`;
                    try {
                        const responseText = xhr.responseText;
                        if (responseText) {
                            const result = JSON.parse(responseText);
                            if (result.message) {
                                errorMessage = result.message;
                            }
                        }
                    } catch (e) {
                        // 若解析失败，使用默认错误信息
                    }

                    transmissionDispatch({
                        type: 'UPDATE_RECORD',
                        id,
                        updates: {
                            status: "error",
                            error: errorMessage,
                            speed: 0
                        }
                    });

                    console.error(errorMessage);
                    reject(new Error(errorMessage));
                }
            };

            xhr.onerror = () => {
                if (intervalId) {
                    clearInterval(intervalId);
                }
                
                const errorMessage = `Upload failed due to a network error`;
                transmissionDispatch({
                    type: 'UPDATE_RECORD',
                    id,
                    updates: {
                        status: "error",
                        error: errorMessage,
                        speed: 0
                    }
                });
                
                console.error(errorMessage);
                reject(new Error(errorMessage));
            };

            xhr.onabort = () => {
                if (intervalId) {
                    clearInterval(intervalId);
                }
                // onabort 由取消操作触发，状态已在 reducer 中更新
            };

            xhr.open('POST', url, true);
            const formData = new FormData();
            formData.append("file", file, name);
            xhr.send(formData);
        });
    }, []);

    const handleUploadDir = async (files: FileList | null, fsId: string) => {
        if (!files) {
            return;
        }
        setUploading(true);
        const records: TransmissionRecord[] = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const relativePath = file['webkitRelativePath'];
            records.push({
                id: generateRandomId(),
                path: getFileKey(file),
                name: relativePath,
                loaded: 0,
                size: file.size,
                percent: 0,
                status: "preparing",
                error: "",
                speed: 0,
            });
        }
        
        transmissionDispatch({ type: 'ADD_RECORDS', records });

        try {
            const uploadPromises = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const relativePath = file['webkitRelativePath'];
                const dir = relativePath.substring(0, relativePath.length - file.name.length);
                
                uploadPromises.push(uploadFile(records[i].id, file, currentDirectory + '/' + dir, fsId));
            }
            
            await Promise.allSettled(uploadPromises);
            filesQuery.refetch();
        } finally {
            setUploading(false);
        }
    }

    const handleUploadFile = async (files: FileList | null, fsId: string) => {
        if (!files) {
            return;
        }

        setUploading(true);
        const records: TransmissionRecord[] = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            records.push({
                id: generateRandomId(),
                path: getFileKey(file),
                name: getFileName(file),
                loaded: 0,
                size: file.size,
                percent: 0,
                status: "preparing",
                error: "",
                speed: 0,
            });
        }
        
        transmissionDispatch({ type: 'ADD_RECORDS', records });

        try {
            const uploadPromises = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                uploadPromises.push(uploadFile(records[i].id, file, currentDirectory, fsId));
            }
            
            await Promise.allSettled(uploadPromises);
            filesQuery.refetch();
        } finally {
            setUploading(false);
        }
    }

    const realDeleteFile = async (keys: string[]) => {
        try {
            for (let key of keys) {
                await fileSystemApi.rm(fsId, key);
            }
            filesQuery.refetch();
        } finally {
            setSelectedRowKeys([]);
        }
    }

    const handleDeleteFile = (keys: string[]) => {
        modal.confirm({
            title: t('fs.delete_confirm.title'),
            content: t('fs.delete_confirm.content'),
            onOk: () => {
                realDeleteFile(keys)
            },
        });
    }

    const handlePromptOk = async (value: string) => {
        setPromptState({
            ...promptState,
            loading: true,
        })
        try {
            switch (promptState.type) {
                case "create-dir":
                    await fileSystemApi.mkdir(fsId, `${currentDirectory}/${value}`);
                    break;
                case "create-file":
                    await fileSystemApi.touch(fsId, `${currentDirectory}/${value}`);
                    break;
                case "rename":
                    await fileSystemApi.rename(fsId, `${currentDirectory}/${promptState.value}`, `${currentDirectory}/${value}`);
                    break;
            }
            filesQuery.refetch();
        } finally {
            setPromptState({
                ...promptState,
                loading: false,
                open: false,
            })
        }
    }

    const getPromptTitle = () => {
        switch (promptState.type) {
            case "create-dir":
                return t('fs.operations.create_dir');
            case "create-file":
                return t('fs.operations.create_file');
            case "rename":
                return t('fs.operations.rename');
            default:
                return 'Prompt';
        }
    }


    // 计算统计信息
    const transmissionStats = useMemo(() => {
        const totalRecords = transmissionRecords.length;
        const completedRecords = transmissionRecords.filter(r => r.status === 'success').length;
        const errorRecords = transmissionRecords.filter(r => r.status === 'error').length;
        const activeRecords = transmissionRecords.filter(r => 
            r.status === 'uploading' || r.status === 'transmitting' || r.status === 'preparing'
        ).length;
        
        return { totalRecords, completedRecords, errorRecords, activeRecords };
    }, [transmissionRecords]);

    let uploadDirLabel = t('fs.operations.upload_dir');
    if (license.isFree()) {
        uploadDirLabel += ` (${t('settings.license.type.options.premium')})`;
    }

    let batchDownloadLabel = t('fs.operations.batch_download');
    if (license.isFree()) {
        batchDownloadLabel += ` (${t('settings.license.type.options.premium')})`;
    }

    return (
        <div>
            <Drawer title="FileSystem"
                    placement="right"
                    onClose={onClose}
                    open={open}
                    width={720}
                    mask={mask}
                    maskClosable={maskClosable}
                    push={false}
                    getContainer={false}
                    extra={
                        <div>
                            <div className={'flex items-center gap-4'}>
                                <Tooltip title={t('fs.operations.upload_file')}>
                                    {strategy?.upload &&
                                        <FileUpIcon className={'h-4 w-4 cursor-pointer'} onClick={() => {
                                            fileUploadRef.current?.click();
                                        }}/>
                                    }
                                    <input type="file"
                                           ref={fileUploadRef}
                                           style={{display: 'none'}}
                                           onChange={async (e) => {
                                               let files = e.target.files;
                                               await handleUploadFile(files, fsId);
                                               e.target.value = '';
                                           }}
                                           multiple/>
                                </Tooltip>

                                <Tooltip title={uploadDirLabel}>
                                    {strategy?.upload &&
                                        <FolderUpIcon className={cn(
                                            'h-4 w-4 cursor-pointer', license.isFree() && 'text-gray-400 cursor-no-drop'
                                        )} onClick={() => {
                                            if (license.isFree()) {
                                                return
                                            }
                                            dirUploadRef.current?.click();
                                        }}/>
                                    }
                                    <input type="file"
                                           ref={dirUploadRef}
                                           style={{display: 'none'}}
                                           onChange={async (e) => {
                                               let files = e.target.files;
                                               await handleUploadDir(files, fsId);
                                               e.target.value = '';
                                           }}
                                           directory=""
                                           webkitdirectory=""
                                           multiple
                                    />
                                </Tooltip>

                                <Tooltip title={t('fs.operations.create_file')}>
                                    {strategy?.createFile &&
                                        <FilePlus2Icon className={'h-4 w-4 cursor-pointer'} onClick={() => {
                                            setPromptState({
                                                loading: false, value: "", open: true, type: "create-file"
                                            })
                                        }}/>
                                    }
                                </Tooltip>

                                <Tooltip title={t('fs.operations.create_dir')}>
                                    {strategy?.createDir &&
                                        <FolderUpIcon className={'h-4 w-4 cursor-pointer'} onClick={() => {
                                            setPromptState({
                                                loading: false, value: "", open: true, type: "create-dir"
                                            })
                                        }}/>
                                    }
                                </Tooltip>

                                <Tooltip
                                    title={batchDownloadLabel}>
                                    {strategy?.download &&
                                        <DownloadIcon
                                            className={cn('h-4 w-4 cursor-pointer', license.isFree() && 'text-gray-400 cursor-no-drop')}
                                            onClick={() => {
                                                if (license.isFree()) {
                                                    return;
                                                }
                                                if (selectedRowKeys.length === 0) {
                                                    return
                                                }
                                                let filenames = JSON.stringify(selectedRowKeys);
                                                let b64 = Base64.encode(filenames, true);
                                                let url = `${baseUrl()}/${fileSystemApi.group}/${fsId}/batch/download?filenames=${b64}&X-Auth-Token=${getToken()}`;
                                                browserDownload(url);
                                            }}
                                        />
                                    }
                                </Tooltip>

                                <Tooltip title={t('fs.operations.remove')}>
                                    {strategy?.delete &&
                                        <Trash2Icon className={'h-4 w-4 cursor-pointer'} onClick={() => {
                                            if (!hasSelected) {
                                                return
                                            }
                                            handleDeleteFile(selectedRowKeys);
                                        }}/>
                                    }
                                </Tooltip>
                            </div>
                        </div>
                    }
            >
                <Row gutter={8} style={{paddingBottom: 8}}>
                    <Col>
                        <Tooltip title={t('fs.navigation.back_to_prev')}>
                            <Button style={{padding: 8}} onClick={rollback}>
                                <Undo2 className={iconClassName}/>
                            </Button>
                        </Tooltip>
                    </Col>
                    <Col flex="auto">
                        <Input value={currentDirectoryForInput}
                               onChange={(e) => {
                                   setCurrentDirectoryForInput(e.target.value)
                               }}
                               onPressEnter={(e) => {
                                   setCurrentDirectory(currentDirectoryForInput);
                               }}
                        />
                    </Col>
                    <Col>
                        <Space>
                            <Tooltip
                                title={hiddenFileVisible ? t('fs.navigation.hide_hidden_file') : t('fs.navigation.show_hidden_file')}>
                                <Button
                                    onClick={() => setHiddenFileVisible(!hiddenFileVisible)}
                                    icon={hiddenFileVisible ? <EyeInvisibleOutlined/> : <EyeOutlined/>}
                                >
                                </Button>
                            </Tooltip>

                            <Tooltip title={t('fs.navigation.refresh')}>
                                <Button
                                    onClick={() => filesQuery.refetch()}
                                    icon={<ReloadOutlined/>}
                                >
                                </Button>
                            </Tooltip>

                            <Tooltip title={t('fs.navigation.file_tran')}>
                                <Button
                                    onClick={() => setFileTransmitterOpen(!fileTransmitterOpen)}
                                    icon={<SyncOutlined
                                        spin={uploading}
                                        className={cn(
                                            uploading && 'text-blue-500'
                                        )}
                                    />}
                                >
                                    {transmissionStats.activeRecords > 0 && (
                                        <span className="ml-1 text-xs">
                                            {transmissionStats.activeRecords}
                                        </span>
                                    )}
                                </Button>
                            </Tooltip>
                        </Space>
                    </Col>
                </Row>

                <ScrollArea style={{
                    height: window.innerHeight - 240,
                }}>
                    <Table
                        virtual
                        scroll={{y: window.innerHeight - 240}}
                        rowKey={'path'}
                        columns={fileColumns}
                        rowSelection={rowSelection}
                        dataSource={files}
                        size={'small'}
                        pagination={false}
                        loading={filesQuery.isFetching}
                        onRow={(file, index) => {
                            return {
                                onDoubleClick: event => {
                                    if (!file.isDir && !file.isLink) return;
                                    setCurrentDirectory(file.path);
                                },
                                onContextMenu: (event) => {
                                    event.preventDefault();

                                    setSelectedRowKeys([file.path]);

                                    const {innerWidth, innerHeight} = window;
                                    let adjustedX = event.pageX;
                                    let adjustedY = event.pageY;
                                    let menuRectWidth = 150;
                                    let menuRectHeight = 200;

                                    if (adjustedX + menuRectWidth > innerWidth) {
                                        adjustedX = innerWidth - menuRectWidth;
                                    }

                                    if (adjustedY + menuRectHeight > innerHeight) {
                                        adjustedY = innerHeight - menuRectHeight;
                                    }

                                    setContextMenu({
                                        pageX: adjustedX,
                                        pageY: adjustedY,
                                        file,
                                    });
                                }
                            }
                        }}
                    />
                </ScrollArea>

                <Drawer
                    title={
                        <div className="flex items-center justify-between">
                            <span>{t('fs.navigation.file_tran')}</span>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mr-4">
                                {transmissionStats.totalRecords > 0 && (
                                    <div>
                                        {transmissionStats.completedRecords}/{transmissionStats.totalRecords} completed
                                        {transmissionStats.errorRecords > 0 && (
                                            <span className="text-red-500 ml-1">
                                                ({transmissionStats.errorRecords} failed)
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    }
                    placement={'bottom'}
                    onClose={() => setFileTransmitterOpen(false)}
                    open={fileTransmitterOpen}
                    getContainer={false}
                    mask={false}
                    extra={<div>
                        <Button
                            type={'primary'}
                            danger={true}
                            onClick={() => {
                                transmissionDispatch({ type: 'CLEAR_COMPLETED' });
                            }}
                        >
                            {t('actions.clear')}
                        </Button>
                    </div>}
                >
                    <Table
                        rowKey={'id'}
                        columns={tranColumns}
                        dataSource={transmissionRecords}
                        size={'small'}
                        pagination={false}
                        // scroll={{ x: 600 }}
                    />
                </Drawer>

                <PromptModal
                    title={getPromptTitle()}
                    value={promptState.value}
                    open={promptState.open}
                    onOk={handlePromptOk}
                    onCancel={() => {
                        setPromptState({
                            loading: false, value: "", open: false, type: undefined
                        })
                    }}
                    label={t('general.name')}
                    placeholder={''}
                    confirmLoading={promptState.loading}
                />


                {contextHolder}
                {messageContextHolder}

                {contextMenu && (
                    <Dropdown
                        menu={{
                            items
                        }}
                        open={true}
                        trigger={['contextMenu']}
                        onOpenChange={(visible) => !visible && setContextMenu(null)}
                        overlayStyle={{
                            position: 'absolute',
                            left: contextMenu.pageX,
                            top: contextMenu.pageY,
                        }}
                    >
                        <div style={{
                            position: 'fixed',
                            top: contextMenu.pageY,
                            left: contextMenu.pageX,
                            width: 0,
                            height: 0
                        }}/>
                    </Dropdown>
                )}

                {fileEditor.hasOpenFiles && (
                    <FloatButton 
                        badge={{
                            count: fileEditor.unsavedFilesCount
                        }} 
                        onClick={() => {
                            fileEditor.openEditor();
                        }}
                    />
                )}

                <FileEditor
                    fsId={fsId}
                    open={fileEditor.isOpen}
                    onClose={fileEditor.closeEditor}
                    initialFiles={fileEditor.openFiles}
                    onCloseFile={fileEditor.closeFile}
                />
            </Drawer>
        </div>
    );
});

export default FileSystemPage;