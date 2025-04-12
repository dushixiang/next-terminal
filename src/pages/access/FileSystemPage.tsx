import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
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
    X
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
import {Editor as MonacoEditor} from '@monaco-editor/react';
import fileSystemApi, {FileInfo} from "@/src/api/filesystem-api";
import {EyeInvisibleOutlined, EyeOutlined, LineOutlined, ReloadOutlined, SyncOutlined} from "@ant-design/icons";
import copy from "copy-to-clipboard";
import clsx from "clsx";
import SimpleBar from "simplebar-react";
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
    status: "uploading" | "transmitting" | "success" | "error",
    error: string,
    speed: number,
}

interface OpenFile {
    key: string
    title: string
    content: string
    changed: boolean
    language: string
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

function getLanguageFromFileName(fileName: string): string | undefined {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (extension) {
        switch (extension) {
            case 'html':
                return 'html';
            case 'js':
            case 'jsx':
                return 'javascript';
            case 'ts':
            case 'tsx':
                return 'typescript';
            case 'css':
                return 'css';
            case 'go':
                return 'go';
            case 'php':
                return 'php';
            case 'sh':
            case 'bash':
                return 'shell';
            case 'java':
                return 'java';
            case 'py':
                return 'python';
            case 'rb':
                return 'ruby';
            case 'cpp':
                return 'cpp';
            case 'c':
                return 'c';
            case 'cs':
                return 'csharp';
            case 'swift':
                return 'swift';
            case 'kt':
                return 'kotlin';
            case 'json':
                return 'json';
            case 'xml':
                return 'xml';
            case 'yaml':
            case 'yml':
                return 'yaml';
            case 'sql':
                return 'sql';
            // 添加更多的后缀名和对应的语言...
            default:
                return extension;
        }
    }

    return undefined;
}

// ({fsId, strategy, open, onClose, mask, maskClosable}: Props)

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

    let [transmissionRecords, setTransmissionRecords] = useState<TransmissionRecord[]>([]);

    let [uploading, setUploading] = useState(false);
    let [fileTransmitterOpen, setFileTransmitterOpen] = useState(false);

    let [promptState, setPromptState] = useState<PromptState>({
        loading: false, value: "", open: false, type: undefined
    });

    let [openFiles, openFileAction] = useList<OpenFile>();

    let [editorOpen, setEditorOpen] = useState<boolean>(false);
    let [editorSaving, setEditorSaving] = useState<boolean>(false);
    let [activeFileIndex, setActiveFileIndex] = useState<number>(-1);
    let [activeFileKey, setActiveFileKey] = useState<string>('');

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
            onClick: () => {
                let file = contextMenu.file;
                showEditor(file);
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
                return a.modTime?.localeCompare(b.modTime);
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
        },
        {
            title: t('fs.transmission.size'),
            dataIndex: 'size',
            key: 'size',
            render: (value, item) => {
                return renderSize(value);
            },
            width: 100,
        },
        {
            title: t('fs.transmission.status'),
            dataIndex: 'status',
            key: 'status',
            render: (v, item) => {
                switch (v) {
                    case 'uploading':
                        return <Tag color={'processing'}>{t('fs.transmission.options.uploading')}</Tag>;
                    case 'transmitting':
                        return <Tag color={'processing'}>{t('fs.transmission.options.transmitting')}</Tag>;
                    case 'success':
                        return <Tag color={'success'}>{t('fs.transmission.options.upload_success')}</Tag>
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
            render: (v, record) => {
                return `${record.percent?.toFixed(2)}%`
            },
            width: 100,
        },
        {
            title: t('fs.transmission.speed'),
            dataIndex: 'speed',
            key: 'speed',
            render: (v) => {
                return `${renderSize(v)}/S`;
            },
            width: 100,
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

    const uploadFile = async (id: string, file: File, dir: string, fsId: string) => {
        return new Promise((resolve, reject) => {
            let {size} = file;
            let name = getFileName(file);
            let url = `${baseUrl()}/${fileSystemApi.group}/${fsId}/upload?X-Auth-Token=${getToken()}&dir=${dir}`

            const xhr = new XMLHttpRequest();

            let prevTime = Date.now();
            let prevLoaded = 0;

            xhr.upload.onprogress = (event) => {
                if (!event.lengthComputable) {
                    return;
                }
                const currentTime = Date.now();
                const elapsedTime = (currentTime - prevTime) / 1000; // 转换为秒
                const loaded = event.loaded;
                const speed = (loaded - prevLoaded) / elapsedTime; // 每秒传输的字节数

                if (event.loaded === event.total) {
                    setTransmissionRecords((prevState) => {
                        return prevState.map((item) => {
                            if (item.id === id) {
                                item.loaded = 0;
                                item.size = size;
                                item.percent = 0;
                                item.status = "transmitting";
                                return item;
                            }
                            return item;
                        });
                    });

                    // 启动轮询获取上传进度
                    let filename = dir + '/' + name;
                    const intervalId = setInterval(async () => {
                        const progress = await fileSystemApi.uploadProgress(fsId, filename);
                        let transmissionRecord = transmissionRecords.find((item) => item.id === id);
                        if (!transmissionRecord) {
                            clearInterval(intervalId);
                            return;
                        }
                        if (transmissionRecord.status == "error") {
                            clearInterval(intervalId);
                            return;
                        }
                        setTransmissionRecords((prevState) => {
                            return prevState.map((item) => {
                                if (item.id === id) {
                                    item.loaded = progress.written;
                                    item.percent = progress.percent;
                                    item.speed = progress.speed;
                                    return item;
                                }
                                return item;
                            });
                        });

                        if (progress.percent === 100) {
                            clearInterval(intervalId);
                            setTransmissionRecords((prevState) => {
                                return prevState.map((item) => {
                                    if (item.id === id) {
                                        item.loaded = size;
                                        item.size = size;
                                        item.percent = 100;
                                        item.status = "success";
                                        item.error = "";
                                        item.speed = 0;
                                        return item;
                                    }
                                    return item;
                                });
                            })
                        }
                    }, 1000)
                    return;
                }
                let percent = event.loaded * 100 / event.total;
                percent = Math.min(Number(percent.toFixed(2)), 99.99);

                setTransmissionRecords((prevState) => {
                    return prevState.map((item) => {
                        if (item.id === id) {
                            item.loaded = event.loaded;
                            item.size = size;
                            item.percent = percent;
                            item.status = "uploading";
                            item.error = "";
                            item.speed = speed;
                            return item;
                        }
                        return item;
                    });
                })

                prevTime = currentTime;
                prevLoaded = loaded;
            };
            xhr.onreadystatechange = (data) => {
                if (xhr.readyState !== 4) {
                    return;
                }
                resolve(data);
                if (xhr.status >= 200 && xhr.status < 300) {
                    setTransmissionRecords((prevState) => {
                        return prevState.map((item) => {
                            if (item.id === id) {
                                item.loaded = size;
                                item.size = size;
                                item.percent = 100;
                                item.status = "success";
                                item.error = "";
                                item.speed = 0;
                                return item;
                            }
                            return item;
                        });
                    })
                } else if (xhr.status >= 400 && xhr.status < 500) {
                    // 统一处理错误情况
                    let errorMessage = `Upload failed with status code: ${xhr.status}`;
                    try {
                        const responseText = xhr.responseText;
                        const result = JSON.parse(responseText);
                        if (result.message) {
                            errorMessage = result.message;
                        }
                    } catch (e) {
                        // 若解析失败，使用默认错误信息
                    }

                    setTransmissionRecords((prevState) => {
                        return prevState.map((item) => {
                            if (item.id === id) {
                                item.status = "error";
                                item.error = errorMessage;
                                item.speed = 0;
                                return item;
                            }
                            return item;
                        });
                    })

                    console.error(errorMessage)
                    // reject(result);
                }
            }
            xhr.onerror = function () {
                const errorMessage = `Upload failed due to a network error`;
                setTransmissionRecords((prevState) => {
                    return prevState.map((item) => {
                        if (item.id === id) {
                            item.status = "error";
                            item.error = errorMessage;
                            item.speed = 0;
                            return item;
                        }
                        return item;
                    });
                });
                console.error(errorMessage)
                reject(new Error(errorMessage));
            }
            xhr.open('POST', url, true);
            let formData = new FormData();
            formData.append("file", file, name);
            xhr.send(formData);
        });
    }

    const handleUploadDir = async (files: FileList | null, fsId: string) => {
        if (!files) {
            return;
        }
        setUploading(true);
        let records = [] as TransmissionRecord[];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            let relativePath = file['webkitRelativePath'];
            records.push({
                id: generateRandomId(),
                path: getFileKey(file),
                name: relativePath,
                loaded: 0,
                size: file.size,
                percent: 0,
                status: "uploading",
                error: "",
            } as TransmissionRecord);
        }
        setTransmissionRecords((prevState) => {
            return [
                ...prevState,
                ...records,
            ];
        });


        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                let relativePath = file['webkitRelativePath'];
                let dir = relativePath.substring(0, relativePath.length - file.name.length);
                await uploadFile(records[i].id, file, currentDirectory + '/' + dir, fsId);
            }
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
        let records = [] as TransmissionRecord[];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            records.push({
                id: generateRandomId(),
                path: getFileKey(file),
                name: getFileName(file),
                loaded: 0,
                size: file.size,
                percent: 0,
                status: "uploading",
                error: "",
            } as TransmissionRecord);
        }
        setTransmissionRecords((prevState) => {
            return [
                ...prevState,
                ...records,
            ];
        });

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                await uploadFile(records[i].id, file, currentDirectory, fsId);
            }
            filesQuery.refetch();
        } finally {
            setUploading(false)
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

    const showEditor = async (file: FileInfo) => {
        let key = file.path;
        let title = file.name;
        await fetchFile(key, title);

        setEditorOpen(true);
    }

    const hideEditor = () => {
        setEditorOpen(false);
    }

    const fetchFile = async (key: string, title: string) => {
        messageApi.loading({key: key, content: 'Loading'})
        let language = getLanguageFromFileName(title);
        let fileContent = await requests.get(`/${fileSystemApi.group}/${fsId}/download?filename=${key}&X-Auth-Token=${getToken()}&t=${new Date().getTime()}`);

        let index = openFiles.findIndex((v, index) => {
            return v.key === key;
        })

        if (index >= 0) {
            let v = openFiles[index];
            v.content = fileContent;
            v.title = title;
            v.language = language;
            v.changed = false;
            openFileAction.updateAt(index, v);
        } else {
            openFileAction.insertAt(openFiles.length, {
                key: key,
                content: fileContent,
                title: title,
                language: language,
                changed: false,
            })
        }
        messageApi.destroy(key);
        setActiveFileKey(key);
    }

    const handleReFetchFile = async () => {
        if (openFiles.length <= 0) {
            return;
        }
        let openFile = openFiles[activeFileIndex];
        fetchFile(openFile.key, openFile.title);
    }

    const fileitems = openFiles.map((item, index) => {
        let prefix = '';
        if (item.changed) {
            prefix = '* ';
        }
        return {
            key: item.key,
            label: <div className={'flex gap-1 items-center'}>
                <span>{prefix + item.title}</span>
                <X className={'h-4 w-4'} onClick={() => {
                    handleRemoveFileByKey(item.key, index)
                }}/>
            </div>,
            children: <MonacoEditor
                language={item.language}
                height={window.innerHeight * 0.7}
                theme="vs-dark"
                value={item.content}
                options={{
                    selectOnLineNumbers: true
                }}
                loading={editorSaving}
                onMount={(editor, monaco) => {
                    editor.focus();
                }}
                onChange={(newValue, e) => {
                    updateOpenFilesChanged(activeFileIndex, newValue);
                }}
            />
        }
    })

    const handleRemoveFileByKey = (removeKey: string, index: number) => {
        openFileAction.removeAt(index);

        const oldLength = openFiles.length;
        // let index = openFiles.findIndex(item => item.key === removeKey);
        console.log(`oldLength`, oldLength, `index`, index)
        if (index >= 0) {
            if (oldLength === 1) {
                // 只打开了一个文件，关闭之后肯定就没了
                setActiveFileKey('');
            } else {
                if (index === 0) {
                    // 如果关闭的是第一个，则重新打开的是新的第二个
                    let openFile = openFiles[index + 1];
                    setActiveFileKey(openFile.key);
                } else {
                    // 如果关闭的不是第一个，则重新打开的是它前面的那个
                    let openFile = openFiles[index - 1];
                    setActiveFileKey(openFile.key);
                }
            }

        }
    }

    useEffect(() => {
        let index = openFiles.findIndex((v, index) => {
            return v.key === activeFileKey;
        })
        setActiveFileIndex(index);
        // console.log(`activeFileKey changed`, activeFileKey, 'at index', index)
    }, [activeFileKey, openFiles]);

    const updateOpenFilesChanged = (index: number, content: string) => {
        let openFile = openFiles[index];
        openFile.changed = true;
        openFile.content = content;
        openFileAction.updateAt(index, openFile)
    }

    const handleEditFile = async () => {
        if (openFiles.length <= 0) {
            return;
        }
        setEditorSaving(true);
        try {
            let activeFile = openFiles[activeFileIndex];
            await fileSystemApi.edit(fsId, activeFile.key, activeFile.content);
            message.success(t('general.success'))
            fetchFile(activeFile.key, activeFile.title);
        } finally {
            setEditorSaving(false);
        }
    }

    useEffect(() => {
        document.onkeydown = function (e) {
            //按下ctrl+c
            if (e.ctrlKey && e.key === 's') {
                console.log(`other ctrl+s`)
                handleEditFile();
                return false;
            }

            if (e.metaKey && e.key === 's') {
                console.log(`macOS command+s`)
                handleEditFile();
                return false;
            }
        }
        return () => {
            document.onkeydown = null;
        }
    }, [activeFileIndex, openFiles]);

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

                                <Tooltip title={t('fs.operations.upload_dir')}>
                                    {strategy?.upload &&
                                        <FolderUpIcon className={'h-4 w-4 cursor-pointer'} onClick={() => {
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
                                    title={`${t('fs.operations.batch_download')}${license.isFree() && (` (` + t('settings.license.type.options.premium') + `)`)}`}>
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
                                </Button>
                            </Tooltip>
                        </Space>
                    </Col>
                </Row>

                <SimpleBar style={{
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
                </SimpleBar>

                <Drawer
                    title={t('fs.navigation.file_tran')}
                    placement={'bottom'}
                    // closable={false}
                    onClose={() => setFileTransmitterOpen(false)}
                    open={fileTransmitterOpen}
                    getContainer={false}
                    mask={false}
                    extra={<div>
                        <Button
                            type={'primary'}
                            danger={true}
                            onClick={() => {
                                setTransmissionRecords(prevState => {
                                    return prevState.filter(item => item.status === 'uploading' || item.status === 'transmitting');
                                });
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

                <ConfigProvider
                    theme={{
                        algorithm: theme.darkAlgorithm,
                    }}
                >
                    <Modal
                        title={t('fs.editor.label')}
                        // className='modal-no-padding'
                        open={editorOpen}
                        width={window.innerWidth * 0.8}
                        centered={true}
                        onCancel={hideEditor}
                        // mask={false}
                        // maskClosable={false}
                        footer={false}
                        closeIcon={<LineOutlined/>}
                    >
                        <div className={'bg-gray-700 py-2 px-4 rounded text-xs flex gap-2'}>
                            <div className={'cursor-pointer hover:underline'} onClick={handleEditFile}>
                                {t('fs.editor.save')}
                            </div>
                            <div className={'cursor-pointer hover:underline'} onClick={handleReFetchFile}>
                                {t('fs.editor.refetch')}
                            </div>

                            <div className={'cursor-pointer text-green-500'} onClick={() => {
                                copy(openFiles[activeFileIndex]?.key);
                                message.success(t('general.copy_success'));
                            }}>
                                {openFiles[activeFileIndex]?.key}
                            </div>
                        </div>
                        <div className={''}>
                            <Tabs
                                activeKey={activeFileKey}
                                items={fileitems}
                                onChange={setActiveFileKey}
                            />
                            {((!fileitems || fileitems.length == 0) &&
                                <div className={'flex items-center justify-center'}
                                     style={{height: window.innerHeight * 0.7}}>
                                    <Empty/>
                                </div>
                            )}
                        </div>
                    </Modal>
                </ConfigProvider>

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

                {(openFiles.length > 0 &&
                    <FloatButton badge={{count: openFiles.length}} onClick={() => {
                        setEditorOpen(true);
                    }}/>
                )}
            </Drawer>
        </div>
    );
});

export default FileSystemPage;