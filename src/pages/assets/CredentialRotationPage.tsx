import {rotationMessage} from "./rotation-message";
import Disabled from "@/components/Disabled";
import {useLicense} from "@/hook/LicenseContext";
import credentialRotationApi, {RotationLog, RotationPolicy} from "@/api/credential-rotation-api";
import NButton from "@/components/NButton";
import NTable, {type NColumn, type NTableActionType} from "@/components/NTable";
import RotationPolicyModal from "@/pages/assets/RotationPolicyModal";
import {getSort} from "@/utils/sort";
import {useMutation} from "@tanstack/react-query";
import {App, Button, Popconfirm, Space, Switch, Tabs, Tag, Tooltip} from "antd";
import {useRef, useState} from 'react';
import {useTranslation} from "react-i18next";

const api = credentialRotationApi;

const scopeTypeLabels: Record<string, string> = {
    asset: 'menus.resource.submenus.asset',
    credential: 'menus.resource.submenus.credential',
};

const PolicyTable = () => {
    const {t} = useTranslation();
    const {message} = App.useApp();
    const actionRef = useRef<NTableActionType>(null);
    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>('');

    const postOrUpdate = async (values: any) => {
        if (values['id']) {
            await api.updateById(values['id'], values);
        } else {
            await api.create(values);
        }
    }

    let mutation = useMutation({
        mutationFn: postOrUpdate,
        onSuccess: () => {
            actionRef.current?.reload();
            setOpen(false);
            setSelectedRowKey('');
            showSuccess();
        }
    });

    const changeStatusMutation = useMutation({
        mutationFn: ({id, enabled}: { id: string, enabled: boolean }) => api.changeStatus(id, enabled),
        onSuccess: () => actionRef.current?.reload(),
    });

    function showSuccess() {
        message.open({
            type: 'success',
            content: t('general.success'),
        });
    }

    const columns: NColumn<RotationPolicy>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('general.name'),
            dataIndex: 'name',
            key: 'name',
            sorter: true,
        }, {
            title: t('assets.rotation.type_label'),
            dataIndex: 'rotateType',
            key: 'rotateType',
            hideInSearch: true,
            width: 110,
            render: (value) => value === 'private-key'
                ? <Tag color="green" variant="filled">{t('assets.rotation.type.private_key')}</Tag>
                : value === 'password'
                    ? <Tag color="red" variant="filled">{t('assets.rotation.type.password')}</Tag>
                    : value || '-',
        }, {
            title: t('assets.rotation.scope'),
            dataIndex: 'scopeType',
            key: 'scopeType',
            hideInSearch: true,
            width: 140,
            render: (value, record) => {
                const label = t(scopeTypeLabels[value] ?? '');
                if ((record.scopeIds?.length || 0) === 0) {
                    return <span>{t('assets.rotation.scope_all')}</span>;
                }
                return (
                    <Tooltip title={record.scopeIds?.join('、')}>
                        <span>{label} × {record.scopeIds?.length}</span>
                    </Tooltip>
                );
            },
        }, {
            title: t('sysops.spec'),
            dataIndex: 'cron',
            key: 'cron',
            hideInSearch: true,
            width: 150,
            render: (value) => <code className="text-xs">{value}</code>,
        }, {
            title: t('general.status'),
            dataIndex: 'enabled',
            key: 'enabled',
            hideInSearch: true,
            width: 90,
            render: (enabled, record) => {
                return <Switch
                    checkedChildren={t('general.enabled')}
                    unCheckedChildren={t('general.disabled')}
                    checked={enabled === true}
                    loading={changeStatusMutation.isPending}
                    onChange={(_checked) => changeStatusMutation.mutate({id: record.id, enabled: !enabled})}
                />
            }
        }, {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            hideInSearch: true,
            valueType: 'dateTime',
            sorter: true,
            width: 170,
        }, {
            title: t('actions.label'),
            valueType: 'option',
            key: 'option',
            width: 150,
            render: (_text: unknown, record: RotationPolicy) => (
                <Space>
                    <NButton
                        key="edit"
                        onClick={() => {
                            setOpen(true);
                            setSelectedRowKey(record.id);
                        }}
                    >
                        {t('actions.edit')}
                    </NButton>
                    <Popconfirm
                        key={'delete-confirm'}
                        title={t('general.confirm_delete')}
                        onConfirm={async () => {
                            await api.deleteById(record.id);
                            actionRef.current?.reload();
                        }}
                    >
                        <NButton key='delete' danger={true}>{t('actions.delete')}</NButton>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (<div>
        <NTable<RotationPolicy>
            columns={columns}
            actionRef={actionRef}
            request={async (params = {}, sort) => {
                let [sortOrder, sortField] = getSort(sort);

                let result = await api.getPaging({
                    pageIndex: params.current,
                    pageSize: params.pageSize,
                    sortOrder: sortOrder,
                    sortField: sortField,
                    keyword: params.name,
                });

                return {
                    data: result['items'],
                    success: true,
                    total: result['total'],
                };
            }}
            rowKey="id"
            search={{
                labelWidth: 'auto',
            }}
            pagination={{
                defaultPageSize: 10,
                showSizeChanger: true
            }}
            dateFormatter="string"
            headerTitle={false}
            toolBarRender={() => [
                <Button key="button" type="primary" onClick={() => {
                    setOpen(true);
                    setSelectedRowKey('');
                }}>
                    {t('actions.new')}
                </Button>
            ]}
        />

        <RotationPolicyModal
            id={selectedRowKey || undefined}
            open={open}
            confirmLoading={mutation.isPending}
            handleCancel={() => {
                setOpen(false);
                setSelectedRowKey('');
            }}
            handleOk={mutation.mutate}
        />
    </div>);
}

const LogTable = () => {
    const {t} = useTranslation();

    const columns: NColumn<RotationLog>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('menus.resource.submenus.asset'),
            dataIndex: 'assetName',
            key: 'assetName',
        }, {
            title: t('assets.rotation.type_label'),
            dataIndex: 'rotateType',
            key: 'rotateType',
            hideInSearch: true,
            width: 110,
            render: (value) => value === 'private-key'
                ? <Tag color="green" variant="filled">{t('assets.rotation.type.private_key')}</Tag>
                : value === 'password'
                    ? <Tag color="red" variant="filled">{t('assets.rotation.type.password')}</Tag>
                    : value || '-',
        }, {
            title: t('general.status'),
            dataIndex: 'status',
            key: 'status',
            width: 90,
            valueEnum: {
                'success': {text: <Tag color="green">{t('assets.rotation.status.success')}</Tag>},
                'failed': {text: <Tag color="red">{t('assets.rotation.status.failed')}</Tag>},
            },
            render: (value) => value === 'success'
                ? <Tag color="green">{t('assets.rotation.status.success')}</Tag>
                : value === 'failed'
                    ? <Tag color="red">{t('assets.rotation.status.failed')}</Tag>
                    : value || '-',
        }, {
            title: t('assets.rotation.message'),
            dataIndex: 'message',
            key: 'message',
            hideInSearch: true,
            ellipsis: true,
            render: (value) => value ? <span title={value}>{rotationMessage(value, t)}</span> : '-',
        }, {
            title: t('assets.rotation.trigger_label'),
            dataIndex: 'triggerType',
            key: 'triggerType',
            hideInSearch: true,
            width: 120,
            render: (value) => value === 'scheduled'
                ? t('assets.rotation.trigger.scheduled')
                : value === 'manual' ? t('assets.rotation.trigger.manual') : value || '-',
        }, {
            title: t('assets.rotation.operator'),
            dataIndex: 'operator',
            key: 'operator',
            width: 150,
            render: (value) => value || '-',
        }, {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            hideInSearch: true,
            valueType: 'dateTime',
            sorter: true,
            width: 170,
        },
    ];

    return (
        <NTable<RotationLog>
            columns={columns}
            request={async (params = {}, sort) => {
                let [sortOrder, sortField] = getSort(sort);

                let result = await api.getLogPaging({
                    pageIndex: params.current,
                    pageSize: params.pageSize,
                    sortOrder: sortOrder,
                    sortField: sortField,
                    keyword: params.assetName,
                    status: params.status,
                });

                return {
                    data: result['items'],
                    success: true,
                    total: result['total'],
                };
            }}
            rowKey="id"
            search={{
                labelWidth: 'auto',
            }}
            pagination={{
                defaultPageSize: 10,
                showSizeChanger: true
            }}
            dateFormatter="string"
            headerTitle={false}
        />
    );
}

const CredentialRotationPage = () => {
    const {t} = useTranslation();
    const {license, isLoading} = useLicense();

    return (
        <Disabled feature="credential_rotation" disabled={isLoading || !license.hasPremiumFeatures()}>
            <Tabs
                defaultActiveKey="policies"
                items={[
                    {
                        key: 'policies',
                        label: t('assets.rotation.policies_tab'),
                        children: <PolicyTable/>,
                    },
                    {
                        key: 'logs',
                        label: t('assets.rotation.logs_tab'),
                        children: <LogTable/>,
                    },
                ]}
            />
        </Disabled>
    );
}

export default CredentialRotationPage;
