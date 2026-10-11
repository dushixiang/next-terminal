import {useEffect, useState} from "react";
import {
    Alert,
    Button,
    Descriptions,
    Divider,
    Form,
    message,
    Space,
    Switch,
    TimePicker,
    Typography,
    Upload,
} from "antd";
import type {UploadProps} from "antd";
import dayjs from "dayjs";
import {useMutation, useQuery} from "@tanstack/react-query";
import {CloudDownload, RefreshCw, Save, Upload as UploadIcon} from "lucide-react";
import {useTranslation} from "react-i18next";
import geodataApi, {GeoDataConfig} from "@/api/geodata-api";
import Disabled from "@/components/Disabled";
import {useLicense} from "@/hook/LicenseContext";

const timeFormat = 'HH:mm';
const maxFileSize = 200 * 1024 * 1024;

const formatSize = (size: number) => {
    if (!size) {
        return '-';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = size;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }
    return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
};

const formatTime = (value?: string) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-';

const GeoDataSetting = () => {
    const {t} = useTranslation();
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const [taskId, setTaskId] = useState('');
    const {license, isLoading: licenseLoading} = useLicense();
    const hasPremiumFeatures = !licenseLoading && license.hasPremiumFeatures();

    const detailQuery = useQuery({
        queryKey: ['geodata'],
        queryFn: geodataApi.get,
        enabled: hasPremiumFeatures,
    });

    const taskQuery = useQuery({
        queryKey: ['geodata', 'task', taskId],
        queryFn: () => geodataApi.task(taskId),
        enabled: hasPremiumFeatures && !!taskId,
        refetchInterval: taskId ? 2000 : false,
    });

    const configMutation = useMutation({
        mutationFn: geodataApi.setConfig,
        onSuccess: async () => {
            messageApi.success(t('general.success'));
            await detailQuery.refetch();
        },
    });

    const uploadMutation = useMutation({
        mutationFn: geodataApi.upload,
        onSuccess: async () => {
            messageApi.success(t('settings.geodata.upload_success'));
            await detailQuery.refetch();
        },
    });

    const checkMutation = useMutation({
        mutationFn: geodataApi.check,
        onSuccess: (result) => {
            messageApi.info(t(result.updateAvailable
                ? 'settings.geodata.update_available'
                : 'settings.geodata.already_latest'));
        },
    });

    const updateMutation = useMutation({
        mutationFn: geodataApi.update,
        onSuccess: (result) => {
            setTaskId(result.taskId);
            messageApi.success(t('settings.geodata.update_started'));
        },
    });

    useEffect(() => {
        if (!detailQuery.data) {
            return;
        }
        form.setFieldsValue({
            autoUpdateEnabled: detailQuery.data.config.autoUpdateEnabled,
            autoUpdateTime: dayjs(detailQuery.data.config.autoUpdateTime || '03:00', timeFormat),
        });
    }, [detailQuery.data, form]);

    useEffect(() => {
        const task = taskQuery.data;
        if (!task || (task.status !== 'success' && task.status !== 'failed')) {
            return;
        }
        if (task.status === 'success') {
            messageApi.success(t('settings.geodata.update_success'));
            detailQuery.refetch();
        } else {
            messageApi.error(task.message || t('settings.geodata.update_failed'));
        }
        setTaskId('');
    }, [taskQuery.data]);

    const saveConfig = async (values: {autoUpdateEnabled: boolean; autoUpdateTime: dayjs.Dayjs}) => {
        const config: GeoDataConfig = {
            autoUpdateEnabled: values.autoUpdateEnabled,
            autoUpdateTime: values.autoUpdateTime.format(timeFormat),
        };
        await configMutation.mutateAsync(config);
    };

    const uploadRequest: UploadProps['customRequest'] = async ({file, onSuccess, onError}) => {
        try {
            await uploadMutation.mutateAsync(file as File);
            onSuccess?.({});
        } catch (error) {
            onError?.(error as Error);
        }
    };

    const beforeUpload: UploadProps['beforeUpload'] = (file) => {
        if (!file.name.toLowerCase().endsWith('.mmdb')) {
            messageApi.error(t('settings.geodata.mmdb_only'));
            return Upload.LIST_IGNORE;
        }
        if (file.size <= 0 || file.size > maxFileSize) {
            messageApi.error(t('settings.geodata.file_too_large'));
            return Upload.LIST_IGNORE;
        }
        return true;
    };

    const database = detailQuery.data?.database;
    const updating = !!taskId;

    return <>
        {contextHolder}
        <Disabled feature="geodata" disabled={!hasPremiumFeatures}>
            <div className="space-y-4 max-w-4xl">
            <section>
                <Typography.Title level={5}>{t('settings.geodata.current_database')}</Typography.Title>
                {!database?.available && (
                    <Alert type="warning" showIcon title={t('settings.geodata.unavailable')}/>
                )}
                {database?.available && (
                    <Descriptions
                        bordered
                        size="small"
                        column={{xs: 1, sm: 2}}
                        items={[
                            {
                                key: 'database-type',
                                label: t('settings.geodata.database_type'),
                                children: database.databaseType,
                            },
                            {
                                key: 'file-size',
                                label: t('settings.geodata.file_size'),
                                children: formatSize(database.fileSize),
                            },
                            {
                                key: 'build-time',
                                label: t('settings.geodata.build_time'),
                                children: formatTime(database.buildTime),
                            },
                            {
                                key: 'modified-at',
                                label: t('settings.geodata.modified_at'),
                                children: formatTime(database.modifiedAt),
                            },
                            {
                                key: 'sha256',
                                label: 'SHA256',
                                span: 2,
                                children: <Typography.Text copyable className="break-all">{database.sha256}</Typography.Text>,
                            },
                        ]}
                    />
                )}
            </section>

            <Divider/>

            <section>
                <Typography.Title level={5}>{t('settings.geodata.upload_title')}</Typography.Title>
                <Upload.Dragger
                    accept=".mmdb"
                    maxCount={1}
                    showUploadList={false}
                    beforeUpload={beforeUpload}
                    customRequest={uploadRequest}
                    disabled={uploadMutation.isPending || updating}
                >
                    <UploadIcon className="mx-auto mb-2 h-6 w-6"/>
                    <Typography.Text>{t('settings.geodata.upload_tip')}</Typography.Text>
                </Upload.Dragger>
            </section>

            <Divider/>

            <section>
                <Typography.Title level={5}>{t('settings.geodata.online_update')}</Typography.Title>
                <Form form={form} layout="vertical" onFinish={saveConfig} initialValues={{autoUpdateEnabled: false}}>
                    <Form.Item name="autoUpdateEnabled" label={t('settings.geodata.auto_update')} valuePropName="checked">
                        <Switch/>
                    </Form.Item>
                    <Form.Item
                        name="autoUpdateTime"
                        label={t('settings.geodata.auto_update_time')}
                        extra={t('settings.geodata.auto_update_time_tip')}
                        rules={[{required: true}]}
                    >
                        <TimePicker format={timeFormat} allowClear={false}/>
                    </Form.Item>
                    <Space wrap>
                        <Button htmlType="submit" type="primary" icon={<Save size={16}/>} loading={configMutation.isPending}>
                            {t('actions.save')}
                        </Button>
                        <Button
                            icon={<RefreshCw size={16}/>} loading={checkMutation.isPending}
                            disabled={updating} onClick={() => checkMutation.mutate()}
                        >
                            {t('settings.geodata.check_update')}
                        </Button>
                        <Button
                            icon={<CloudDownload size={16}/>} loading={updateMutation.isPending || updating}
                            onClick={() => updateMutation.mutate()}
                        >
                            {t('settings.geodata.update_now')}
                        </Button>
                    </Space>
                </Form>
            </section>
            </div>
        </Disabled>
    </>;
};

export default GeoDataSetting;
