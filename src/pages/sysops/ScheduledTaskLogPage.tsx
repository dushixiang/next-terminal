import React, {useEffect, useRef} from 'react';
import {
    App,
    Button,
    Drawer,
    Tag,
    Space,
    Typography} from "antd";
import NTable, {type NTableActionType, type NColumn} from "@/components/NTable";
import scheduledTaskApi, {
    CheckStatusResult,
    ExecScriptResult,
    RenewCertificateResult,
    ScheduledTaskLog
} from "@/api/scheduled-task-api";
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import {maybe} from "@/utils/maybe";
import {Shield, Server, Code} from "lucide-react";

const {Text} = Typography;

interface Props {
    open: boolean
    handleCancel: () => void
    jobId: string
}

const countBy = <T, >(items: T[] | undefined, predicate: (item: T) => boolean) => {
    const matched = maybe(items?.filter(predicate)?.length, 0);
    const unmatched = maybe(items?.filter(item => !predicate(item))?.length, 0);
    return [matched, unmatched] as const;
};

const nameColumn = (icon: React.ReactNode) => ({
    title: '', // 占位，由调用方覆盖
    dataIndex: 'name',
    key: 'name',
    render: (text: string) => (
        <Space align="center" size={4}>
            {icon}
            <Text strong>{text}</Text>
        </Space>
    ),
});

const usedTimeColumn = (t: (key: string) => string) => ({
    title: t('sysops.logs.used_time'),
    dataIndex: 'usedTimeStr',
    key: 'usedTimeStr',
    render: (text: string) => <Text type="secondary">{text}</Text>,
});

const errorColumn = (t: (key: string) => string, textType: "danger" | "warning" = "danger") => ({
    title: t('sysops.logs.reason'),
    dataIndex: 'error',
    key: 'error',
    render: (text: string) => {
        if (!text) return <Text type="secondary">-</Text>;
        return <Text type={textType}>{text}</Text>;
    },
});

const ScheduledTaskLogPage = ({open, jobId, handleCancel}: Props) => {

    const {t} = useTranslation();
    const actionRef = useRef<NTableActionType>(null);
    const {modal} = App.useApp();

    useEffect(() => {
        if (!open) return;
        actionRef.current?.reload();
    }, [open, jobId]);

    const renderMessage = (record: ScheduledTaskLog) => {
        switch (record.jobType) {
            case 'asset-check-status': {
                const results = record.results as CheckStatusResult[];
                const [active, inactive] = countBy(results, item => item.active);
                return (
                    <Space align="center" size="small">
                        <Server size={14} style={{color: '#1890ff'}}/>
                        <Text>{t('sysops.logs.asset_status_check')}</Text>
                        <Tag color="green">{t('general.online')}: {active}</Tag>
                        <Tag color="red">{t('general.offline')}: {inactive}</Tag>
                    </Space>
                );
            }
            case 'asset-exec-command': {
                const results = record.results as ExecScriptResult[];
                const [success, failed] = countBy(results, item => item.success);
                return (
                    <Space align="center" size="small">
                        <Code size={14} style={{color: '#52c41a'}}/>
                        <Text>{t('sysops.logs.script_execution')}</Text>
                        {success > 0 && <Tag color="green">{t('general.success')}: {success}</Tag>}
                        {failed > 0 && <Tag color="red">{t('general.failed')}: {failed}</Tag>}
                    </Space>
                );
            }
            case 'renew-certificate': {
                const results = record.results as RenewCertificateResult[];
                if (!results || results.length === 0) {
                    return (
                        <Space align="center" size="small">
                            <Shield size={14} style={{color: '#faad14'}}/>
                            <Text>{t('sysops.logs.certificate_renewal')}</Text>
                            <Tag color="blue">{t('sysops.logs.no_certificates_to_renew')}</Tag>
                        </Space>
                    );
                }
                const [renewSuccess, renewFailed] = countBy(results, item => item.success);
                return (
                    <Space align="center" size="small">
                        <Shield size={14} style={{color: '#faad14'}}/>
                        <Text>{t('sysops.logs.certificate_renewal')}</Text>
                        {renewSuccess > 0 &&
                            <Tag color="green">{t('general.success')}: {renewSuccess}</Tag>}
                        {renewFailed > 0 &&
                            <Tag color="orange">{t('sysops.logs.skipped')}: {renewFailed}</Tag>}
                    </Space>
                );
            }
            default:
                return '';
        }
    };

    const columns: NColumn<ScheduledTaskLog>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('sysops.logs.exec_at'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            hideInSearch: true,
            sorter: true,
            width: 191,
            valueType: 'dateTime',
        },
        {
            title: t('sysops.logs.messages'),
            dataIndex: 'message',
            key: 'message',
            hideInSearch: true,
            render: (_, record) => renderMessage(record),
        },
    ];

    const statusColumn = (t: (key: string) => string, field: string, labels: [string, string, string?, string?]) => ({
        title: t('general.status'),
        dataIndex: field,
        key: field,
        render: (text: any) => {
            if (text === true) {
                return <Tag color={labels[2] ?? 'green'}>{labels[0]}</Tag>;
            }
            return <Tag color={labels[3] ?? 'red'}>{labels[1]}</Tag>;
        },
    });

    const getExpandColumns = (jobType: string) => {
        switch (jobType) {
            case 'asset-check-status':
                return [
                    {...nameColumn(<Server size={12} style={{color: '#1890ff'}}/>), title: t('sysops.logs.asset_name')},
                    statusColumn(t, 'active', [t('general.online'), t('general.offline')]),
                    usedTimeColumn(t),
                    errorColumn(t),
                ];
            case 'asset-exec-command':
                return [
                    {...nameColumn(<Code size={12} style={{color: '#52c41a'}}/>), title: t('sysops.logs.asset_name')},
                    statusColumn(t, 'success', [t('general.success'), t('general.failed')]),
                    usedTimeColumn(t),
                    {title: t('sysops.logs.script'), dataIndex: 'script', key: 'script', valueType: 'code'},
                    {title: t('sysops.logs.result'), dataIndex: 'result', key: 'result', valueType: 'code'},
                ];
            case 'renew-certificate':
                return [
                    {...nameColumn(<Shield size={12} style={{color: '#faad14'}}/>), title: t('sysops.logs.certificate_name')},
                    statusColumn(t, 'success', [t('sysops.logs.renewed'), t('sysops.logs.skipped'), 'green', 'orange']),
                    errorColumn(t, 'warning'),
                ];
            default:
                return [];
        }
    };

    const expandedRowRender = (record: ScheduledTaskLog) => (
        <NTable
            size="small"
            columns={getExpandColumns(record.jobType)}
            headerTitle={false}
            search={false}
            options={false}
            dataSource={record.results}
            pagination={false}
        />
    );

    return (
        <Drawer
            title={t('sysops.logs.label')}
            placement="right"
            size={window.innerWidth * 0.9}
            closable={true}
            maskClosable={true}
            onClose={handleCancel}
            open={open}
            styles={{body: {padding: '12px'}}}
            extra={
                <Button
                    type="primary"
                    danger
                    onClick={() => {
                        modal.confirm({
                            title: t('general.clear_confirm'),
                            content: t('sysops.logs.clear_confirm_content'),
                            okText: t('actions.clear'),
                            cancelText: t('actions.cancel'),
                            okType: 'danger',
                            onOk: async () => {
                                await scheduledTaskApi.clearLog(jobId);
                                actionRef.current?.reload();
                            },
                        });
                    }}
                >
                    {t('actions.clear')}
                </Button>
            }
        >
            <NTable
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort) => {
                    const [sortOrder, sortField] = getSort(sort);
                    const queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        name: params.name,
                        sortOrder,
                        sortField,
                    };
                    const result = await scheduledTaskApi.getLogPaging(jobId, queryParams);
                    return {
                        data: result['items'],
                        success: true,
                        total: result['total'],
                    };
                }}
                expandable={{
                    expandedRowRender,
                    expandRowByClick: true,
                }}
                rowKey="id"
                search={false}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                }}
                options={false}
                dateFormatter="string"
                size="middle"
                cardBordered={false}
                headerTitle={false}
            />
        </Drawer>
    );
};

export default ScheduledTaskLogPage;
