import { baseUrl } from "@/api/core/requests";
import accountApi from "@/api/account-api";
import fileSystemApi,{ FileInfo } from "@/api/filesystem-api";
import { Strategy } from "@/api/strategy-api";
import PromptModal from "@/components/PromptModal";
import { useLicense } from "@/hook/LicenseContext";
import { cn } from "@/lib/utils";
import FileEditor from "@/pages/access/FileEditor";
import { useFileEditor } from "@/pages/access/hooks/use-file-editor";
import UploadTaskDrawer from "@/pages/access/upload/UploadTaskDrawer";
import {useUploadManager} from "@/pages/access/upload/UploadManagerProvider";
import strings from "@/utils/strings";
import {getCurrentUser} from "@/utils/permission";
import { browserDownload,isMobileByMediaQuery,renderSize } from "@/utils/utils";
import { EyeInvisibleOutlined,EyeOutlined,ReloadOutlined,SyncOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import type { DrawerProps } from "antd";
import {
Button,
Checkbox,
Col,
Drawer,
Dropdown,
FloatButton,
Input,
MenuProps,
message,
Modal,
Row,
Space,
Table,
Tooltip,
type TableColumnsType
} from "antd";
import clsx from "clsx";
import dayjs from "dayjs";
import { Base64 } from 'js-base64';
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
Shield,
Trash2Icon,
TrashIcon,
Undo2,
} from "lucide-react";
import React,{
forwardRef,
useEffect,
useImperativeHandle,
useRef,
useState
} from 'react';
import { useTranslation } from "react-i18next";
import {MOBILE_TOOL_DRAWER_SIZE, MOBILE_TOOL_DRAWER_STYLES} from "@/pages/access/terminal-tool-drawer";

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
    placement?: DrawerProps['placement']
    size?: DrawerProps['size']
    mask?: boolean
    maskClosable?: boolean
    getContainer?: DrawerProps['getContainer']
}

interface PromptState {
    type: "create-dir" | "create-file" | "rename" | "chmod" | undefined
    value: string
    open: boolean
    loading: boolean
}

interface ChmodState {
    ownerRead: boolean
    ownerWrite: boolean
    ownerExecute: boolean
    groupRead: boolean
    groupWrite: boolean
    groupExecute: boolean
    publicRead: boolean
    publicWrite: boolean
    publicExecute: boolean
}

interface ContextMenu {
    pageX: number,
    pageY: number,
    file: FileInfo,
}

interface ImagePreviewState {
    open: boolean
    file?: FileInfo
    src: string
}

const iconClassName = 'h-4 w-4'

const previewableImageExtensions = new Set([
    'avif',
    'bmp',
    'gif',
    'ico',
    'jpg',
    'jpeg',
    'png',
    'svg',
    'webp',
]);

function getFileExtension(fileName: string) {
    return fileName.split('.').pop()?.toLowerCase();
}

function isPreviewableImageFile(file?: FileInfo) {
    if (!file || file.isDir) {
        return false;
    }
    const extension = getFileExtension(file.name);
    return !!extension && previewableImageExtensions.has(extension);
}

function getFileIconFromFileName(fileName: string) {
    let icon = <File className={iconClassName}/>
    const extension = getFileExtension(fileName);
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
                                                          placement,
                                                          size,
                                                          mask,
                                                          maskClosable,
                                                          getContainer = false
                                                      }: Props, ref) => {

    let {t} = useTranslation();
    const isMobile = isMobileByMediaQuery();

    let fileUploadRef = useRef<HTMLInputElement>(null);
    let dirUploadRef = useRef<HTMLInputElement>(null);
    const fileTableContainerRef = useRef<HTMLDivElement>(null);
    const dragCounterRef = useRef(0);

    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    let [currentDirectory, setCurrentDirectory] = useState('/');
    let [currentDirectoryForInput, setCurrentDirectoryForInput] = useState(currentDirectory);
    let [files, setFiles] = useState<FileInfo[]>([]);
    let [hiddenFileVisible, setHiddenFileVisible] = useState<boolean>(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [fileTableScrollY, setFileTableScrollY] = useState(240);

    const {manager: uploadManager, tasks: uploadTasks} = useUploadManager();
    const accountInfoQuery = useQuery({
        queryKey: ['infoQuery'],
        queryFn: accountApi.getUserInfo,
        enabled: open && !getCurrentUser(),
        staleTime: 5 * 60 * 1000,
    });
    const [fileTransmitterOpen, setFileTransmitterOpen] = useState(false);
    const filesystemUploadTasks = uploadTasks.filter(task => task.fsId === fsId);
    const activeUploadCount = filesystemUploadTasks.filter(task =>
        task.status === 'queued' || task.status === 'retrying' || task.status === 'initializing' || task.status === 'uploading' || task.status === 'transmitting'
    ).length;
    const uploading = activeUploadCount > 0;
    const uploadAccountReady = Boolean(getCurrentUser());

    useEffect(() => {
        if (accountInfoQuery.data) {
            uploadManager.syncAccount();
        }
    }, [accountInfoQuery.data, uploadManager]);

    let [promptState, setPromptState] = useState<PromptState>({
        loading: false, value: "", open: false, type: undefined
    });

    let [chmodState, setChmodState] = useState<ChmodState>({
        ownerRead: false,
        ownerWrite: false,
        ownerExecute: false,
        groupRead: false,
        groupWrite: false,
        groupExecute: false,
        publicRead: false,
        publicWrite: false,
        publicExecute: false,
    });

    const fileEditor = useFileEditor(fsId);

    const [modal, contextHolder] = Modal.useModal();
    const [messageApi, messageContextHolder] = message.useMessage();
    const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
    const [imagePreview, setImagePreview] = useState<ImagePreviewState>({
        open: false,
        src: '',
    });
    let { license } = useLicense();
    const dragUploadHint = t('fs.drag_upload_hint');
    const dragUploadDisabledMessage = t('fs.drag_upload_disabled');
    const uploadInitializingMessage = t('fs.upload_initializing');

    let editLabel = t('actions.edit');
    if (!license.hasPremiumFeatures()) {
        editLabel += ` (${t('settings.license.type.premium')})`;
    }

    const getFileDownloadUrl = (filename: string) => {
        return `${baseUrl()}/${fileSystemApi.group}/${fsId}/download?filename=${encodeURIComponent(filename)}`;
    };

    const items: MenuProps['items'] = [
        {
            label: editLabel,
            key: 'edit',
            icon: <FileEdit className={iconClassName}/>,
            disabled: contextMenu?.file?.isDir || !license.hasPremiumFeatures(),
            onClick: async () => {
                if (!contextMenu) return;
                let file = contextMenu.file;
                const loadingKey = `loading`
                messageApi.open({
                    type: 'loading',
                    key: loadingKey,
                    content: 'Loading...',
                    duration: 0,
                })

                try {
                    await fileEditor.openFile(file);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    messageApi.error(`Failed to open file: ${errorMessage}`);
                } finally {
                    messageApi.destroy(loadingKey);
                }
            },
        },
        {
            label: t('fs.operations.preview_image'),
            key: 'preview-image',
            icon: <FileImage className={iconClassName}/>,
            disabled: !isPreviewableImageFile(contextMenu?.file),
            onClick: () => {
                if (!contextMenu) return;
                let file = contextMenu.file;
                setImagePreview({
                    open: true,
                    file,
                    src: getFileDownloadUrl(file.path),
                });
            },
        },
        {
            label: t('fs.operations.chmod'),
            key: 'chmod',
            icon: <Shield className={iconClassName}/>,
            onClick: () => {
                if (!contextMenu) return;
                let file = contextMenu.file;
                // 解析文件权限
                const mode = file.mode;
                // mode 格式通常是 -rwxrwxrwx 或 drwxrwxrwx
                const perms = mode.slice(-9); // 取最后9位
                setChmodState({
                    ownerRead: perms[0] === 'r',
                    ownerWrite: perms[1] === 'w',
                    ownerExecute: perms[2] === 'x',
                    groupRead: perms[3] === 'r',
                    groupWrite: perms[4] === 'w',
                    groupExecute: perms[5] === 'x',
                    publicRead: perms[6] === 'r',
                    publicWrite: perms[7] === 'w',
                    publicExecute: perms[8] === 'x',
                });
                setPromptState({
                    loading: false, open: true, type: "chmod", value: file.name
                })
            },
        },
        {
            label: t('authorised.strategy.download'),
            key: 'download',
            icon: <Download className={iconClassName}/>,
            disabled: contextMenu?.file?.isDir,
            onClick: () => {
                if (!contextMenu) return;
                let file = contextMenu.file;
                browserDownload(getFileDownloadUrl(file.path));
            },
        },
        {
            label: t('authorised.strategy.rename'),
            key: 'rename',
            icon: <FolderEdit className={iconClassName}/>,
            onClick: () => {
                if (!contextMenu) return;
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
            label: t('actions.delete'),
            key: 'delete',
            danger: true,
            icon: <TrashIcon className={iconClassName}/>,
            onClick: () => {
                if (!contextMenu) return;
                let keys = [contextMenu.file.path];
                setSelectedRowKeys(keys);
                handleDeleteFile(keys);
            },
        },
    ];

    useImperativeHandle(ref, () => ({
        changeDir: (s: string) => setCurrentDirectory(s),
    }));

    let filesQuery = useQuery({
        queryKey: ['files', fsId, currentDirectory, hiddenFileVisible],
        enabled: open,
        retry: 0,
        queryFn: () => {
            return fileSystemApi.ls(fsId, currentDirectory, hiddenFileVisible);
        }
    });

    useEffect(() => {
        setCurrentDirectoryForInput(currentDirectory);
    }, [currentDirectory]);

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

    useEffect(() => {
        if (!open) {
            return;
        }

        const container = fileTableContainerRef.current;
        if (!container) {
            return;
        }

        const updateTableScrollY = () => {
            const table = container.querySelector<HTMLElement>('.ant-table');
            const virtualHolder = container.querySelector<HTMLElement>('.ant-table-tbody-virtual-holder');
            const tableHeader = container.querySelector<HTMLElement>('.ant-table-thead');
            const fixedTableHeight = table && virtualHolder
                ? table.offsetHeight - virtualHolder.offsetHeight
                : tableHeader?.offsetHeight ?? 0;

            setFileTableScrollY(Math.max(Math.floor(container.clientHeight - fixedTableHeight), 1));
        };

        const resizeObserver = new ResizeObserver(updateTableScrollY);
        resizeObserver.observe(container);
        const tableHeader = container.querySelector<HTMLElement>('.ant-table-thead');
        if (tableHeader) {
            resizeObserver.observe(tableHeader);
        }
        const animationFrame = requestAnimationFrame(updateTableScrollY);
        window.visualViewport?.addEventListener('resize', updateTableScrollY);

        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(animationFrame);
            window.visualViewport?.removeEventListener('resize', updateTableScrollY);
        };
    }, [files.length, open]);

    const renderFileIcon = (file: FileInfo) => {
        if (file.isDir) {
            return <Folder color={'#4096ff'} className={iconClassName}/>
        } else if (file.isLink) {
            return <Link className={iconClassName}/>
        } else {
            return getFileIconFromFileName(file.name);
        }
    }

    const fileColumns: TableColumnsType<FileInfo> = [
        {
            title: t('fs.attributes.path'),
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => {
                return a.name?.localeCompare(b.name);
            },
            render: (_value, file) => {
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
            render: (value, item, _index) => {
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
            render: (value, _item) => {
                return <span>{dayjs(value).format(`YYYY-MM-DD HH:mm:ss`)}</span>;
            },
        }, {
            title: t('identity.role.permission'),
            dataIndex: 'mode',
            key: 'mode',
            width: 100,
            render: (value, _item) => {
                return <span className={'dode'}>{value}</span>;
            },
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

    const joinRemoteDirectory = (baseDirectory: string, relativeDirectory: string) => {
        const base = baseDirectory === '/' ? '' : baseDirectory.replace(/\/+$/, '');
        const relative = relativeDirectory.replace(/^\/+|\/+$/g, '');
        return `${base}/${relative}` || '/';
    };

    const handleUploadDir = (files: FileList | null, fsId: string) => {
        if (!uploadAccountReady) {
            messageApi.warning(uploadInitializingMessage);
            return;
        }
        if (!files) {
            return;
        }
        const uploadFiles = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const relativePath = file.webkitRelativePath || file.name;
            const relativeDirectory = relativePath.substring(0, relativePath.length - file.name.length);
            uploadFiles.push({
                file,
                directory: joinRemoteDirectory(currentDirectory, relativeDirectory),
                displayName: relativePath,
            });
        }
        uploadManager.enqueue({fsId, files: uploadFiles});
    }

    const handleUploadFile = (files: FileList | null, fsId: string) => {
        if (!uploadAccountReady) {
            messageApi.warning(uploadInitializingMessage);
            return;
        }
        if (!files) {
            return;
        }
        const uploadFiles = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            uploadFiles.push({
                file,
                directory: currentDirectory,
                displayName: file.name,
            });
        }
        uploadManager.enqueue({fsId, files: uploadFiles});
    }

    const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!strategy?.upload || !uploadAccountReady) {
            event.dataTransfer.dropEffect = 'none';
            return;
        }
        dragCounterRef.current += 1;
        if (!isDraggingOver) {
            setIsDraggingOver(true);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!strategy?.upload || !uploadAccountReady) {
            event.dataTransfer.dropEffect = 'none';
            return;
        }
        event.dataTransfer.dropEffect = 'copy';
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!strategy?.upload) {
            return;
        }
        dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
        if (dragCounterRef.current === 0) {
            setIsDraggingOver(false);
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        dragCounterRef.current = 0;
        setIsDraggingOver(false);

        if (!strategy?.upload) {
            messageApi.warning(dragUploadDisabledMessage);
            return;
        }
        if (!uploadAccountReady) {
            messageApi.warning(uploadInitializingMessage);
            return;
        }

        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) {
            return;
        }

        handleUploadFile(files, fsId);
    };

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
                case "chmod":
                    // 计算权限值
                    let mode = 0;
                    if (chmodState.ownerRead) mode += 0o400;
                    if (chmodState.ownerWrite) mode += 0o200;
                    if (chmodState.ownerExecute) mode += 0o100;
                    if (chmodState.groupRead) mode += 0o040;
                    if (chmodState.groupWrite) mode += 0o020;
                    if (chmodState.groupExecute) mode += 0o010;
                    if (chmodState.publicRead) mode += 0o004;
                    if (chmodState.publicWrite) mode += 0o002;
                    if (chmodState.publicExecute) mode += 0o001;
                    await fileSystemApi.chmod(fsId, `${currentDirectory}/${promptState.value}`, mode);
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
                return t('authorised.strategy.create_file');
            case "rename":
                return t('authorised.strategy.rename');
            case "chmod":
                return t('fs.operations.chmod');
            default:
                return 'Prompt';
        }
    }


    let uploadDirLabel = t('fs.operations.upload_dir');
    if (!license.hasPremiumFeatures()) {
        uploadDirLabel += ` (${t('settings.license.type.premium')})`;
    }

    let batchDownloadLabel = t('fs.operations.batch_download');
    if (!license.hasPremiumFeatures()) {
        batchDownloadLabel += ` (${t('settings.license.type.premium')})`;
    }
    const drawerPlacement = placement ?? (isMobile ? 'bottom' : 'right');

    return (
        <div>
            <Drawer title={t('fs.title')}
                    placement={drawerPlacement}
                    onClose={onClose}
                    open={open}
                    size={size ?? (isMobile ? MOBILE_TOOL_DRAWER_SIZE : 720)}
                    mask={{enabled: mask, closable: maskClosable}}
                    push={false}
                    styles={{
                        ...(drawerPlacement === 'bottom' ? MOBILE_TOOL_DRAWER_STYLES : {}),
                        body: {
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        },
                    }}
                    getContainer={getContainer}
                    extra={
                        <div>
                            <div className={'flex items-center gap-4'}>
                                <Tooltip title={uploadAccountReady ? t('fs.operations.upload_file') : uploadInitializingMessage}>
                                    {strategy?.upload &&
                                        <FileUpIcon className={cn(
                                            'h-4 w-4 cursor-pointer',
                                            !uploadAccountReady && 'text-gray-400 cursor-wait'
                                        )} onClick={() => {
                                            if (!uploadAccountReady) {
                                                messageApi.warning(uploadInitializingMessage);
                                                return;
                                            }
                                            fileUploadRef.current?.click();
                                        }}/>
                                    }
                                    <input type="file"
                                           ref={fileUploadRef}
                                           style={{display: 'none'}}
                                           onChange={(e) => {
                                               let files = e.target.files;
                                               handleUploadFile(files, fsId);
                                               e.target.value = '';
                                           }}
                                           multiple/>
                                </Tooltip>

                                <Tooltip title={uploadAccountReady ? uploadDirLabel : uploadInitializingMessage}>
                                    {strategy?.upload &&
                                        <FolderUpIcon className={cn(
                                            'h-4 w-4 cursor-pointer',
                                            !uploadAccountReady && 'text-gray-400 cursor-wait',
                                            uploadAccountReady && !license.hasPremiumFeatures() && 'text-gray-400 cursor-no-drop'
                                        )} onClick={() => {
                                            if (!uploadAccountReady) {
                                                messageApi.warning(uploadInitializingMessage);
                                                return;
                                            }
                                            if (!license.hasPremiumFeatures()) {
                                                return
                                            }
                                            dirUploadRef.current?.click();
                                        }}/>
                                    }
                                    <input type="file"
                                           ref={dirUploadRef}
                                           style={{display: 'none'}}
                                           onChange={(e) => {
                                               let files = e.target.files;
                                               handleUploadDir(files, fsId);
                                               e.target.value = '';
                                           }}
                                           directory=""
                                           webkitdirectory=""
                                           multiple
                                    />
                                </Tooltip>

                                <Tooltip title={t('authorised.strategy.create_file')}>
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
                                            className={cn('h-4 w-4 cursor-pointer', !license.hasPremiumFeatures() && 'text-gray-400 cursor-no-drop')}
                                            onClick={() => {
                                                if (!license.hasPremiumFeatures()) {
                                                    return;
                                                }
                                                if (selectedRowKeys.length === 0) {
                                                    return
                                                }
                                                let filenames = JSON.stringify(selectedRowKeys);
                                                let b64 = Base64.encode(filenames, true);
                                                let url = `${baseUrl()}/${fileSystemApi.group}/${fsId}/batch/download?filenames=${b64}`;
                                                browserDownload(url);
                                            }}
                                        />
                                    }
                                </Tooltip>

                                <Tooltip title={t('actions.delete')}>
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
                <Row gutter={8} style={{paddingBottom: 8, flexShrink: 0}}>
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
                               onPressEnter={(_e) => {
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

                            <Tooltip title={t('actions.refresh')}>
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
                                    {activeUploadCount > 0 && (
                                        <span className="ml-1 text-xs">
                                            {activeUploadCount}
                                        </span>
                                    )}
                                </Button>
                            </Tooltip>
                        </Space>
                    </Col>
                </Row>

                <div
                    ref={fileTableContainerRef}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        'relative min-h-0 flex-1 overflow-hidden',
                        strategy?.upload && 'rounded-md border border-transparent transition-colors',
                        strategy?.upload && isDraggingOver && 'border-dashed border-blue-400 bg-blue-50/60'
                    )}
                >
                    {strategy?.upload && isDraggingOver && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div
                                className="rounded-md border border-blue-400 bg-white/90 px-6 py-3 text-sm font-medium text-blue-600">
                                {dragUploadHint}
                            </div>
                        </div>
                    )}
                    <Table
                        virtual
                        scroll={{y: fileTableScrollY}}
                        style={{overflowY: 'hidden'}}
                        rowKey={'path'}
                        columns={fileColumns}
                        rowSelection={rowSelection}
                        dataSource={files}
                        size={'small'}
                        pagination={false}
                        loading={filesQuery.isFetching}
                        onRow={(file, _index) => {
                            return {
                                onDoubleClick: _event => {
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
                </div>

                <UploadTaskDrawer
                    fsId={fsId}
                    onClose={() => setFileTransmitterOpen(false)}
                    open={fileTransmitterOpen}
                    getContainer={getContainer}
                />

                <PromptModal
                    title={getPromptTitle()}
                    value={promptState.value}
                    open={promptState.open && promptState.type !== "chmod"}
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

                <Modal
                    title={t('fs.operations.chmod')}
                    open={promptState.open && promptState.type === "chmod"}
                    onOk={() => handlePromptOk(promptState.value)}
                    onCancel={() => {
                        setPromptState({
                            loading: false, value: "", open: false, type: undefined
                        })
                    }}
                    confirmLoading={promptState.loading}
                >
                    <div className="space-y-4">
                        <div>
                            <div className="font-semibold mb-2">{t('fs.attributes.permissions.owner')}</div>
                            <Space>
                                <Checkbox
                                    checked={chmodState.ownerRead}
                                    onChange={(e) => setChmodState({...chmodState, ownerRead: e.target.checked})}
                                >
                                    {t('general.read')}
                                </Checkbox>
                                <Checkbox
                                    checked={chmodState.ownerWrite}
                                    onChange={(e) => setChmodState({...chmodState, ownerWrite: e.target.checked})}
                                >
                                    {t('general.write')}
                                </Checkbox>
                                <Checkbox
                                    checked={chmodState.ownerExecute}
                                    onChange={(e) => setChmodState({...chmodState, ownerExecute: e.target.checked})}
                                >
                                    {t('fs.attributes.permissions.group_execute')}
                                </Checkbox>
                            </Space>
                        </div>

                        <div>
                            <div className="font-semibold mb-2">{t('fs.attributes.permissions.group')}</div>
                            <Space>
                                <Checkbox
                                    checked={chmodState.groupRead}
                                    onChange={(e) => setChmodState({...chmodState, groupRead: e.target.checked})}
                                >
                                    {t('general.read')}
                                </Checkbox>
                                <Checkbox
                                    checked={chmodState.groupWrite}
                                    onChange={(e) => setChmodState({...chmodState, groupWrite: e.target.checked})}
                                >
                                    {t('general.write')}
                                </Checkbox>
                                <Checkbox
                                    checked={chmodState.groupExecute}
                                    onChange={(e) => setChmodState({...chmodState, groupExecute: e.target.checked})}
                                >
                                    {t('fs.attributes.permissions.group_execute')}
                                </Checkbox>
                            </Space>
                        </div>

                        <div>
                            <div className="font-semibold mb-2">{t('fs.attributes.permissions.public')}</div>
                            <Space>
                                <Checkbox
                                    checked={chmodState.publicRead}
                                    onChange={(e) => setChmodState({...chmodState, publicRead: e.target.checked})}
                                >
                                    {t('general.read')}
                                </Checkbox>
                                <Checkbox
                                    checked={chmodState.publicWrite}
                                    onChange={(e) => setChmodState({...chmodState, publicWrite: e.target.checked})}
                                >
                                    {t('general.write')}
                                </Checkbox>
                                <Checkbox
                                    checked={chmodState.publicExecute}
                                    onChange={(e) => setChmodState({...chmodState, publicExecute: e.target.checked})}
                                >
                                    {t('fs.attributes.permissions.group_execute')}
                                </Checkbox>
                            </Space>
                        </div>

                        <div className="mt-4 p-3 bg-gray-50 rounded dark:bg-gray-700">
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                {t('identity.role.permission')}: {
                                ((chmodState.ownerRead ? 4 : 0) + (chmodState.ownerWrite ? 2 : 0) + (chmodState.ownerExecute ? 1 : 0)).toString() +
                                ((chmodState.groupRead ? 4 : 0) + (chmodState.groupWrite ? 2 : 0) + (chmodState.groupExecute ? 1 : 0)).toString() +
                                ((chmodState.publicRead ? 4 : 0) + (chmodState.publicWrite ? 2 : 0) + (chmodState.publicExecute ? 1 : 0)).toString()
                            }
                            </div>
                        </div>
                    </div>
                </Modal>


                <Modal
                    title={imagePreview.file?.name || t('fs.operations.preview_image')}
                    open={imagePreview.open}
                    onCancel={() => {
                        setImagePreview({
                            open: false,
                            src: '',
                        });
                    }}
                    footer={null}
                    width={'80vw'}
                    centered
                    destroyOnHidden={true}
                >
                    <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded p-4">
                        {imagePreview.src && (
                            <img
                                src={imagePreview.src}
                                alt={imagePreview.file?.name || t('fs.operations.preview_image')}
                                className="max-h-[calc(70vh-32px)] max-w-full object-contain"
                            />
                        )}
                    </div>
                </Modal>

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
                        styles={{
                            root: {
                                position: 'absolute',
                                left: contextMenu.pageX,
                                top: contextMenu.pageY,
                            }
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
                    openFiles={fileEditor.openFiles}
                    activeFileKey={fileEditor.activeFileKey}
                    onActiveFileChange={fileEditor.setActiveFile}
                    onFileContentChange={fileEditor.updateFileContent}
                    onFileSaved={fileEditor.markFileSaved}
                    onCloseFile={fileEditor.closeFile}
                    onRefreshFile={fileEditor.refreshFile}
                />
            </Drawer>
        </div>
    );
});

export default FileSystemPage;
