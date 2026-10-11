import {useEffect, useState} from 'react';
import {
    Alert,
    App,
    Button,
    Collapse,
    Divider,
    Form,
    Input,
    InputNumber,
    message,
    Popconfirm,
    Radio,
    Space,
    Switch,
    Table,
    Tag,
    TimePicker,
    Typography,
    type TableColumnsType
} from "antd";
import {useMutation, useQuery} from "@tanstack/react-query";
import dayjs from "dayjs";
import {Download, Play, RefreshCw, RotateCcw, Save, Trash2, Upload} from "lucide-react";
import requests from "@/api/core/requests";
import backupApi, {BackupConfigUpdate, BackupFile, BackupSuccessActions} from "@/api/backup-api";
import {useTranslation} from "react-i18next";
import {backupTaskMessage} from './backup-task-message';
import {AssetTreeSelect} from "@/components/shared/QuerySelects";
import PromptModal from "@/components/PromptModal";

const timeFormat = 'HH:mm';

const defaultSuccessActions: BackupSuccessActions = {
    s3: {
        enabled: false,
        endpoint: '',
        accessKeyId: '',
        secretAccessKey: '',
        bucket: '',
        region: '',
        useSsl: true,
        pathStyle: false,
        prefix: '',
    },
    sftp: {
        enabled: false,
        mode: 'asset',
        assetId: '',
        directory: '',
        host: '',
        port: 22,
        username: '',
        authType: 'password',
        password: '',
        privateKey: '',
        passphrase: '',
    },
    webdav: {
        enabled: false,
        endpoint: '',
        username: '',
        password: '',
        directory: '',
    },
};

const isMaskedSecret = (value?: string) => !!value && value.includes('*');

const clearMaskedSecrets = (actions: BackupSuccessActions) => ({
    ...actions,
    s3: {
        ...actions.s3,
        secretAccessKey: isMaskedSecret(actions.s3.secretAccessKey) ? '' : actions.s3.secretAccessKey,
    },
    sftp: {
        ...actions.sftp,
        password: isMaskedSecret(actions.sftp.password) ? '' : actions.sftp.password,
        privateKey: isMaskedSecret(actions.sftp.privateKey) ? '' : actions.sftp.privateKey,
        passphrase: isMaskedSecret(actions.sftp.passphrase) ? '' : actions.sftp.passphrase,
    },
    webdav: {
        ...actions.webdav,
        password: isMaskedSecret(actions.webdav.password) ? '' : actions.webdav.password,
    },
});

const requiredUnlessSaved = (hasSaved: boolean) => hasSaved ? [] : [{required: true}];

const formatSize = (size: number) => {
    if (!size) {
        return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = size;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value = value / 1024;
        index += 1;
    }
    return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
};

const sourceLabel = (source: string, t: ReturnType<typeof useTranslation>['t']) => {
    switch (source) {
        case 'auto':
            return t('settings.backup.source.auto');
        case 'manual':
            return t('settings.backup.source.manual');
        case 'before-restore':
            return t('settings.backup.source.before_restore');
        default:
            return source || '-';
    }
};

const BackupSetting = () => {
    const {t} = useTranslation();
    const {modal} = App.useApp();
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const [activeTaskId, setActiveTaskId] = useState('');
    const [legacyImporting, setLegacyImporting] = useState(false);
    const [createBackupModalOpen, setCreateBackupModalOpen] = useState(false);
    const [hasSavedSecret, setHasSavedSecret] = useState({
        s3SecretAccessKey: false,
        sftpPassword: false,
        sftpPrivateKey: false,
        sftpPassphrase: false,
        webdavPassword: false,
    });

    const configQuery = useQuery({
        queryKey: ['backup', 'config'],
        queryFn: backupApi.getConfig,
    });

    const filesQuery = useQuery({
        queryKey: ['backup', 'files'],
        queryFn: backupApi.files,
    });

    const taskQuery = useQuery({
        queryKey: ['backup', 'task', activeTaskId],
        queryFn: () => backupApi.task(activeTaskId),
        enabled: !!activeTaskId,
        refetchInterval: activeTaskId ? 2000 : false,
    });

    const saveConfigMutation = useMutation({
        mutationFn: backupApi.setConfig,
        onSuccess: async () => {
            messageApi.success(t('general.success'));
            await configQuery.refetch();
        },
    });

    const testS3Mutation = useMutation({
        mutationFn: backupApi.testS3Action,
        onSuccess: () => {
            messageApi.success(t('general.success'));
        },
    });

    const testSFTPMutation = useMutation({
        mutationFn: backupApi.testSFTPAction,
        onSuccess: () => {
            messageApi.success(t('general.success'));
        },
    });

    const testWebDAVMutation = useMutation({
        mutationFn: backupApi.testWebDAVAction,
        onSuccess: () => {
            messageApi.success(t('general.success'));
        },
    });

    const createMutation = useMutation({
        mutationFn: backupApi.create,
        onSuccess: (data) => {
            setActiveTaskId(data.taskId);
            messageApi.success(t('settings.backup.create_task_success'));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: backupApi.delete,
        onSuccess: async () => {
            messageApi.success(t('general.success'));
            await filesQuery.refetch();
        },
    });

    const restoreMutation = useMutation({
        mutationFn: backupApi.restore,
        onSuccess: (data) => {
            setActiveTaskId(data.taskId);
            messageApi.success(t('settings.backup.restore_task_success'));
        },
    });

    const uploadRestoreMutation = useMutation({
        mutationFn: backupApi.uploadRestore,
        onSuccess: (data) => {
            setActiveTaskId(data.taskId);
            messageApi.success(t('settings.backup.upload_restore_task_success'));
            filesQuery.refetch();
        },
    });

    useEffect(() => {
        if (!configQuery.data) {
            return;
        }
        const successActions = {
            s3: {
                ...defaultSuccessActions.s3,
                ...configQuery.data.successActions?.s3,
            },
            sftp: {
                ...defaultSuccessActions.sftp,
                ...configQuery.data.successActions?.sftp,
            },
            webdav: {
                ...defaultSuccessActions.webdav,
                ...configQuery.data.successActions?.webdav,
            },
        };

        setHasSavedSecret({
            s3SecretAccessKey: isMaskedSecret(successActions.s3.secretAccessKey),
            sftpPassword: isMaskedSecret(successActions.sftp.password),
            sftpPrivateKey: isMaskedSecret(successActions.sftp.privateKey),
            sftpPassphrase: isMaskedSecret(successActions.sftp.passphrase),
            webdavPassword: isMaskedSecret(successActions.webdav.password),
        });

        form.setFieldsValue({
            ...configQuery.data,
            successActions: clearMaskedSecrets(successActions),
            scheduleTime: dayjs(configQuery.data.scheduleTime || '04:00', timeFormat),
        });
    }, [configQuery.data, form]);

    useEffect(() => {
        const task = taskQuery.data;
        if (!task || (task.status !== 'success' && task.status !== 'failed')) {
            return;
        }
        if (task.status === 'success') {
            messageApi.success(backupTaskMessage(task, t));
            filesQuery.refetch();
        }
        if (task.status === 'failed') {
            messageApi.error(backupTaskMessage(task, t));
        }
        setActiveTaskId('');
    }, [taskQuery.data, messageApi, filesQuery, t]);

    const handleSaveConfig = async (values: any) => {
        const successActions = {
            s3: {
                ...defaultSuccessActions.s3,
                ...values.successActions?.s3,
                enabled: !!values.successActions?.s3?.enabled,
                useSsl: !!values.successActions?.s3?.useSsl,
                pathStyle: !!values.successActions?.s3?.pathStyle,
            },
            sftp: {
                ...defaultSuccessActions.sftp,
                ...values.successActions?.sftp,
                enabled: !!values.successActions?.sftp?.enabled,
                port: values.successActions?.sftp?.port || 22,
            },
            webdav: {
                ...defaultSuccessActions.webdav,
                ...values.successActions?.webdav,
                enabled: !!values.successActions?.webdav?.enabled,
            },
        };
        const retentionDays = Number(values.retentionDays);
        const payload: BackupConfigUpdate = {
            scheduleEnabled: !!values.scheduleEnabled,
            scheduleTime: values.scheduleTime ? values.scheduleTime.format(timeFormat) : '04:00',
            retentionDays: Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 7,
            successActions,
        };
        await saveConfigMutation.mutateAsync(payload);
    };

    const handleTestS3 = async () => {
        const values = await form.validateFields([
            ['successActions', 's3', 'endpoint'],
            ['successActions', 's3', 'bucket'],
            ['successActions', 's3', 'accessKeyId'],
            ['successActions', 's3', 'secretAccessKey'],
            ['successActions', 's3', 'region'],
            ['successActions', 's3', 'prefix'],
            ['successActions', 's3', 'useSsl'],
            ['successActions', 's3', 'pathStyle'],
        ]);
        const action = {
            ...defaultSuccessActions.s3,
            ...values.successActions?.s3,
            enabled: true,
            useSsl: !!values.successActions?.s3?.useSsl,
            pathStyle: !!values.successActions?.s3?.pathStyle,
        };
        await testS3Mutation.mutateAsync(action);
    };

    const handleTestSFTP = async () => {
        const values = await form.validateFields([
            ['successActions', 'sftp', 'mode'],
            ['successActions', 'sftp', 'assetId'],
            ['successActions', 'sftp', 'directory'],
            ['successActions', 'sftp', 'host'],
            ['successActions', 'sftp', 'port'],
            ['successActions', 'sftp', 'username'],
            ['successActions', 'sftp', 'authType'],
            ['successActions', 'sftp', 'password'],
            ['successActions', 'sftp', 'privateKey'],
            ['successActions', 'sftp', 'passphrase'],
        ]);
        const action = {
            ...defaultSuccessActions.sftp,
            ...values.successActions?.sftp,
            enabled: true,
            port: values.successActions?.sftp?.port || 22,
        };
        await testSFTPMutation.mutateAsync(action);
    };

    const handleTestWebDAV = async () => {
        const values = await form.validateFields([
            ['successActions', 'webdav', 'endpoint'],
            ['successActions', 'webdav', 'username'],
            ['successActions', 'webdav', 'password'],
            ['successActions', 'webdav', 'directory'],
        ]);
        const action = {
            ...defaultSuccessActions.webdav,
            ...values.successActions?.webdav,
            enabled: true,
        };
        await testWebDAVMutation.mutateAsync(action);
    };

    const handleLegacyImport = (files: FileList | null) => {
        if (!files || !files[0]) {
            return;
        }
        const reader = new FileReader();
        reader.onload = async () => {
            if (!reader.result) {
                return;
            }
            const backup = JSON.parse(reader.result.toString());
            setLegacyImporting(true);
            try {
                await requests.post('/admin/backup/import', backup);
                messageApi.success(t('settings.backup.restore_success'), 3);
            } finally {
                setLegacyImporting(false);
            }
        };
        reader.readAsText(files[0]);
    };

    const handleCreateBackup = () => {
        setCreateBackupModalOpen(true);
    };

    const handleCreateBackupConfirm = async (remark: string) => {
        await createMutation.mutateAsync(remark);
        setCreateBackupModalOpen(false);
    };

    const handleRestore = (file: BackupFile) => {
        modal.confirm({
            title: t('settings.backup.restore_confirm_title'),
            content: (
                <Space orientation="vertical">
                    <Typography.Text>{t('settings.backup.restore_confirm_content')}</Typography.Text>
                    <Typography.Text type="secondary">{t('settings.backup.backup_file', {name: file.name})}</Typography.Text>
                    <Typography.Text type="secondary">{t('general.remark_label')}{file.remark || '-'}</Typography.Text>
                    <Typography.Text type="secondary">{t('settings.backup.exclude_tip')}</Typography.Text>
                </Space>
            ),
            okText: t('settings.backup.restore'),
            okButtonProps: {danger: true},
            onOk: async () => {
                await restoreMutation.mutateAsync(file.name);
            },
        });
    };

    const handleUploadRestore = (files: FileList | null) => {
        const file = files?.[0];
        if (!file) {
            return;
        }
        modal.confirm({
            title: t('settings.backup.upload_restore_confirm_title'),
            content: (
                <Space orientation="vertical">
                    <Typography.Text>{t('settings.backup.upload_restore_confirm_content')}</Typography.Text>
                    <Typography.Text type="secondary">{t('settings.backup.backup_file', {name: file.name})}</Typography.Text>
                    <Typography.Text type="secondary">{t('settings.backup.exclude_tip')}</Typography.Text>
                </Space>
            ),
            okText: t('settings.backup.restore'),
            okButtonProps: {danger: true},
            onOk: async () => {
                await uploadRestoreMutation.mutateAsync(file);
            },
        });
    };

    const columns: TableColumnsType<BackupFile> = [
        {
            title: t('settings.backup.file_name'),
            dataIndex: 'name',
            ellipsis: true,
        },
        {
            title: t('general.remark'),
            dataIndex: 'remark',
            width: 200,
            ellipsis: true,
            render: (value: string) => value || '-',
        },
        {
            title: t('settings.backup.backup_time'),
            dataIndex: 'createdAt',
            width: 191,
            render: (value: string) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: t('settings.backup.source_label'),
            dataIndex: 'source',
            width: 100,
            render: (value: string) => <Tag>{sourceLabel(value, t)}</Tag>,
        },
        {
            title: t('settings.backup.size'),
            dataIndex: 'size',
            width: 110,
            render: (value: number) => formatSize(value),
        },
        {
            title: t('settings.backup.version'),
            dataIndex: 'appVersion',
            width: 100,
            render: (value: string) => value || '-',
        },
        {
            title: t('actions.label'),
            width: 190,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Button icon={<Download size={16}/>} onClick={() => backupApi.download(record.name)}/>
                    <Button icon={<RotateCcw size={16}/>} danger loading={restoreMutation.isPending}
                            onClick={() => handleRestore(record)}/>
                    <Popconfirm title={t('settings.backup.delete_confirm_title')}
                                onConfirm={() => deleteMutation.mutate(record.name)}>
                        <Button icon={<Trash2 size={16}/>} danger loading={deleteMutation.isPending}/>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const task = taskQuery.data;
    const taskRunning = task?.status === 'pending' || task?.status === 'running' || createMutation.isPending || restoreMutation.isPending || uploadRestoreMutation.isPending;
    const backupDirectory = configQuery.data?.directory || 'data/backups';

    return (
        <div>
            {contextHolder}
            <PromptModal
                title={t('settings.backup.create_confirm_title')}
                value=""
                open={createBackupModalOpen}
                onOk={handleCreateBackupConfirm}
                onCancel={() => setCreateBackupModalOpen(false)}
                label={t('general.remark')}
                placeholder={t('general.enter_remark')}
                confirmLoading={createMutation.isPending}
                required={false}
                multiline
                maxLength={200}
                showCount
                okText={t('settings.backup.backup_now')}
            />
            <Space orientation="vertical" style={{width: '100%'}} size={16}>
                <Alert
                    type="info"
                    title={t('settings.backup.backup_directory_tip', {directory: backupDirectory})}
                />

                <Form form={form} layout="vertical" onFinish={handleSaveConfig}>
                    <Space orientation="vertical" style={{width: '100%'}} size={16}>
                        <Space wrap align="end">
                            <Form.Item name="scheduleEnabled" label={t('settings.backup.schedule_enabled')}
                                       valuePropName="checked" style={{marginBottom: 0}}>
                                <Switch/>
                            </Form.Item>
                            <Form.Item name="scheduleTime" label={t('settings.backup.backup_time')}
                                       style={{marginBottom: 0}}>
                                <TimePicker format={timeFormat} minuteStep={5} style={{width: 112}}/>
                            </Form.Item>
                            <Form.Item label={t('settings.backup.retention_days')} style={{marginBottom: 0}}>
                                <Space.Compact>
                                    <Form.Item name="retentionDays" noStyle>
                                        <InputNumber min={1} max={365} precision={0} style={{width: 88}}/>
                                    </Form.Item>
                                    <Space.Addon>{t('general.days')}</Space.Addon>
                                </Space.Compact>
                            </Form.Item>
                            <Form.Item style={{marginBottom: 0}}>
                                <Space wrap>
                                    <Button icon={<Play size={16}/>} loading={taskRunning}
                                            onClick={handleCreateBackup}>
                                        {t('settings.backup.backup_now')}
                                    </Button>
                                    <Button danger icon={<Upload size={16}/>} loading={uploadRestoreMutation.isPending}
                                            disabled={taskRunning}
                                            onClick={() => document.getElementById('backup-upload-restore')?.click()}>
                                        {t('settings.backup.upload_restore')}
                                    </Button>
                                    <Button icon={<RefreshCw size={16}/>} onClick={() => filesQuery.refetch()}
                                            loading={filesQuery.isFetching}>
                                        {t('actions.refresh')}
                                    </Button>
                                    <input type="file"
                                           id="backup-upload-restore"
                                           style={{display: 'none'}}
                                           accept={".ntbak"}
                                           onChange={async (e) => {
                                               handleUploadRestore(e.target.files);
                                               e.target.value = '';
                                           }}
                                    />
                                </Space>
                            </Form.Item>
                        </Space>

                        <Collapse
                            items={[
                                {
                                    key: 'success-actions',
                                    label: t('settings.backup.success_actions'),
                                    children: (
                                        <Space orientation="vertical" style={{width: '100%'}} size={16}>
                                            <Typography.Text type="secondary">
                                                {t('settings.backup.success_actions_tip')}
                                            </Typography.Text>
                                            <Space orientation="vertical" style={{width: '100%'}}>
                                                <Form.Item name={['successActions', 's3', 'enabled']}
                                                           label={t('settings.backup.upload_to_s3')}
                                                           valuePropName="checked">
                                                    <Switch/>
                                                </Form.Item>
                                                <Form.Item noStyle shouldUpdate>
                                                    {formInstance => {
                                                        const enabled = formInstance.getFieldValue(['successActions', 's3', 'enabled']);
                                                        if (!enabled) {
                                                            return null;
                                                        }
                                                        return (
                                                            <Space wrap align="start">
                                                                <Form.Item name={['successActions', 's3', 'endpoint']}
                                                                           label={t('settings.backup.s3_endpoint')}
                                                                           rules={[{required: true}]}>
                                                                    <Input style={{width: 260}} placeholder="s3.amazonaws.com"/>
                                                                </Form.Item>
                                                                <Form.Item name={['successActions', 's3', 'bucket']}
                                                                           label={t('settings.backup.s3_bucket')}
                                                                           rules={[{required: true}]}>
                                                                    <Input style={{width: 180}}/>
                                                                </Form.Item>
                                                                <Form.Item name={['successActions', 's3', 'accessKeyId']}
                                                                           label={t('settings.backup.s3_access_key_id')}
                                                                           rules={[{required: true}]}>
                                                                    <Input style={{width: 220}}/>
                                                                </Form.Item>
                                                                <Form.Item name={['successActions', 's3', 'secretAccessKey']}
                                                                           label={t('settings.backup.s3_secret_access_key')}
                                                                           rules={requiredUnlessSaved(hasSavedSecret.s3SecretAccessKey)}>
                                                                    <Input.Password style={{width: 220}}
                                                                                    placeholder={hasSavedSecret.s3SecretAccessKey ? t('settings.backup.saved_secret_placeholder') : ''}/>
                                                                </Form.Item>
                                                                <Form.Item name={['successActions', 's3', 'region']}
                                                                           label={t('settings.backup.s3_region')}>
                                                                    <Input style={{width: 160}}/>
                                                                </Form.Item>
                                                                <Form.Item name={['successActions', 's3', 'prefix']}
                                                                           label={t('settings.backup.s3_prefix')}>
                                                                    <Input style={{width: 220}} placeholder="backups"/>
                                                                </Form.Item>
                                                                <Form.Item name={['successActions', 's3', 'useSsl']}
                                                                           label={t('settings.backup.s3_use_ssl')}
                                                                           valuePropName="checked">
                                                                    <Switch/>
                                                                </Form.Item>
                                                                <Form.Item name={['successActions', 's3', 'pathStyle']}
                                                                           label={t('settings.backup.s3_path_style')}
                                                                           valuePropName="checked">
                                                                    <Switch/>
                                                                </Form.Item>
                                                                <Form.Item label=" ">
                                                                    <Button loading={testS3Mutation.isPending}
                                                                            onClick={handleTestS3}>
                                                                        {t('actions.test_connection')}
                                                                    </Button>
                                                                </Form.Item>
                                                            </Space>
                                                        );
                                                    }}
                                                </Form.Item>
                                            </Space>

                                            <Divider style={{margin: '4px 0'}}/>

                                            <Space orientation="vertical" style={{width: '100%'}}>
                                                <Form.Item name={['successActions', 'sftp', 'enabled']}
                                                           label={t('settings.backup.upload_to_sftp')}
                                                           valuePropName="checked">
                                                    <Switch/>
                                                </Form.Item>
                                                <Form.Item noStyle shouldUpdate>
                                                    {formInstance => {
                                                        const enabled = formInstance.getFieldValue(['successActions', 'sftp', 'enabled']);
                                                        if (!enabled) {
                                                            return null;
                                                        }
                                                        const mode = formInstance.getFieldValue(['successActions', 'sftp', 'mode']);
                                                        const authType = formInstance.getFieldValue(['successActions', 'sftp', 'authType']);
                                                        return (
                                                            <Space orientation="vertical" style={{width: '100%'}}>
                                                                <Space wrap align="start">
                                                                    <Form.Item name={['successActions', 'sftp', 'mode']}
                                                                               label={t('settings.backup.sftp_mode')}
                                                                               rules={[{required: true}]}>
                                                                        <Radio.Group options={[
                                                                            {
                                                                                label: t('settings.backup.sftp_mode_asset'),
                                                                                value: 'asset',
                                                                            },
                                                                            {
                                                                                label: t('settings.backup.sftp_mode_custom'),
                                                                                value: 'custom',
                                                                            },
                                                                        ]}/>
                                                                    </Form.Item>
                                                                    <Form.Item name={['successActions', 'sftp', 'directory']}
                                                                               label={t('settings.backup.sftp_directory')}
                                                                               rules={[{required: true}]}>
                                                                        <Input style={{width: 260}} placeholder="/data/backups"/>
                                                                    </Form.Item>
                                                                </Space>
                                                                {mode === 'asset' && (
                                                                    <Form.Item name={['successActions', 'sftp', 'assetId']}
                                                                               label={t('settings.backup.sftp_asset')}
                                                                               rules={[{required: true}]}>
                                                                        <AssetTreeSelect protocol="ssh" style={{maxWidth: 420}}/>
                                                                    </Form.Item>
                                                                )}
                                                                {mode === 'custom' && (
                                                                    <Space orientation="vertical" style={{width: '100%'}}>
                                                                        <Space wrap align="start">
                                                                            <Form.Item name={['successActions', 'sftp', 'host']}
                                                                                       label={t('settings.backup.sftp_host')}
                                                                                       rules={[{required: true}]}>
                                                                                <Input style={{width: 220}}/>
                                                                            </Form.Item>
                                                                            <Form.Item name={['successActions', 'sftp', 'port']}
                                                                                       label={t('settings.backup.sftp_port')}
                                                                                       rules={[{required: true}]}>
                                                                                <InputNumber min={1} max={65535} style={{width: 120}}/>
                                                                            </Form.Item>
                                                                            <Form.Item name={['successActions', 'sftp', 'username']}
                                                                                       label={t('settings.backup.sftp_username')}
                                                                                       rules={[{required: true}]}>
                                                                                <Input style={{width: 180}}/>
                                                                            </Form.Item>
                                                                            <Form.Item name={['successActions', 'sftp', 'authType']}
                                                                                       label={t('settings.backup.sftp_auth_type')}
                                                                                       rules={[{required: true}]}>
                                                                                <Radio.Group options={[
                                                                                    {
                                                                                        label: t('assets.password'),
                                                                                        value: 'password',
                                                                                    },
                                                                                    {
                                                                                        label: t('assets.private_key'),
                                                                                        value: 'privateKey',
                                                                                    },
                                                                                ]}/>
                                                                            </Form.Item>
                                                                        </Space>
                                                                        {authType === 'password' && (
                                                                            <Form.Item name={['successActions', 'sftp', 'password']}
                                                                                       label={t('assets.password')}
                                                                                       rules={requiredUnlessSaved(hasSavedSecret.sftpPassword)}>
                                                                                <Input.Password style={{maxWidth: 320}}
                                                                                                placeholder={hasSavedSecret.sftpPassword ? t('settings.backup.saved_secret_placeholder') : ''}/>
                                                                            </Form.Item>
                                                                        )}
                                                                        {authType === 'privateKey' && (
                                                                            <Space orientation="vertical" style={{width: '100%'}}>
                                                                                <Form.Item name={['successActions', 'sftp', 'privateKey']}
                                                                                           label={t('assets.private_key')}
                                                                                           rules={requiredUnlessSaved(hasSavedSecret.sftpPrivateKey)}>
                                                                                    <Input.TextArea rows={5} style={{maxWidth: 620}}
                                                                                                    placeholder={hasSavedSecret.sftpPrivateKey ? t('settings.backup.saved_secret_placeholder') : ''}/>
                                                                                </Form.Item>
                                                                                <Form.Item name={['successActions', 'sftp', 'passphrase']}
                                                                                           label={t('assets.passphrase')}>
                                                                                    <Input.Password style={{maxWidth: 320}}
                                                                                                    placeholder={hasSavedSecret.sftpPassphrase ? t('settings.backup.saved_secret_placeholder') : ''}/>
                                                                                </Form.Item>
                                                                            </Space>
                                                                        )}
                                                                    </Space>
                                                                )}
                                                                <Button loading={testSFTPMutation.isPending}
                                                                        onClick={handleTestSFTP}>
                                                                    {t('actions.test_connection')}
                                                                </Button>
                                                            </Space>
                                                        );
                                                    }}
                                                </Form.Item>
                                            </Space>

                                            <Divider style={{margin: '4px 0'}}/>

                                            <Space orientation="vertical" style={{width: '100%'}}>
                                                <Form.Item name={['successActions', 'webdav', 'enabled']}
                                                           label={t('settings.backup.upload_to_webdav')}
                                                           valuePropName="checked">
                                                    <Switch/>
                                                </Form.Item>
                                                <Form.Item noStyle shouldUpdate>
                                                    {formInstance => {
                                                        const enabled = formInstance.getFieldValue(['successActions', 'webdav', 'enabled']);
                                                        if (!enabled) {
                                                            return null;
                                                        }
                                                        return (
                                                            <Space orientation="vertical" style={{width: '100%'}}>
                                                                <Alert type="warning"
                                                                       showIcon
                                                                       title={t('settings.backup.webdav_chinese_path_tip')}/>
                                                                <Space wrap align="start">
                                                                    <Form.Item name={['successActions', 'webdav', 'endpoint']}
                                                                               label={t('settings.backup.webdav_endpoint')}
                                                                               rules={[{required: true}]}>
                                                                        <Input style={{width: 320}} placeholder="https://example.com/dav"/>
                                                                    </Form.Item>
                                                                    <Form.Item name={['successActions', 'webdav', 'username']}
                                                                               label={t('settings.backup.webdav_username')}
                                                                               rules={[{required: true}]}>
                                                                        <Input style={{width: 180}}/>
                                                                    </Form.Item>
                                                                    <Form.Item name={['successActions', 'webdav', 'password']}
                                                                               label={t('settings.backup.webdav_password')}
                                                                               rules={requiredUnlessSaved(hasSavedSecret.webdavPassword)}>
                                                                        <Input.Password style={{width: 220}}
                                                                                        placeholder={hasSavedSecret.webdavPassword ? t('settings.backup.saved_secret_placeholder') : ''}/>
                                                                    </Form.Item>
                                                                    <Form.Item name={['successActions', 'webdav', 'directory']}
                                                                               label={t('settings.backup.webdav_directory')}
                                                                               rules={[{required: true}]}>
                                                                        <Input style={{width: 260}} placeholder="/backups"/>
                                                                    </Form.Item>
                                                                    <Form.Item label=" ">
                                                                        <Button loading={testWebDAVMutation.isPending}
                                                                                onClick={handleTestWebDAV}>
                                                                            {t('actions.test_connection')}
                                                                        </Button>
                                                                    </Form.Item>
                                                                </Space>
                                                            </Space>
                                                        );
                                                    }}
                                                </Form.Item>
                                            </Space>
                                        </Space>
                                    ),
                                },
                            ]}
                        />

                        <Form.Item style={{marginBottom: 0}}>
                            <Button type="primary" htmlType="submit" icon={<Save size={16}/>}
                                    loading={saveConfigMutation.isPending}>
                                {t('settings.backup.save_settings')}
                            </Button>
                        </Form.Item>
                    </Space>
                </Form>

                {task && activeTaskId && (
                    <Alert
                        type={task.status === 'failed' ? 'error' : 'info'}
                        title={backupTaskMessage(task, t)}
                    />
                )}

                <Table
                    rowKey="name"
                    columns={columns}
                    dataSource={filesQuery.data || []}
                    loading={filesQuery.isLoading || filesQuery.isFetching}
                    scroll={{x: 980}}
                    pagination={{pageSize: 10}}
                />

                <Collapse
                    items={[
                        {
                            key: 'legacy',
                            label: t('settings.backup.legacy_import'),
                            children: (
                                <Space orientation="vertical">
                                    <Alert type="warning"
                                           title={t('settings.backup.legacy_import_tip')}/>
                                    <Space>
                                        <Button loading={legacyImporting} icon={<Upload size={16}/>} onClick={() => {
                                            document.getElementById('legacy-backup-upload')?.click();
                                        }}>
                                            {t('settings.backup.recovery')}
                                        </Button>
                                        <input type="file"
                                               id="legacy-backup-upload"
                                               style={{display: 'none'}}
                                               accept={".json"}
                                               onChange={async (e) => {
                                                   handleLegacyImport(e.target.files);
                                                   e.target.value = '';
                                               }}
                                        />
                                    </Space>
                                </Space>
                            ),
                        },
                    ]}
                />
            </Space>
        </div>
    );
};

export default BackupSetting;
