import React, {useEffect, useRef} from 'react';
import {App, Button, Drawer, Progress, Tag, Space, Typography, Card} from "antd";
import {ActionType, ProColumns, ProTable} from '@ant-design/pro-components';
import scheduledTaskApi, {CheckStatusResult, ExecScriptResult, RenewCertificateResult, ScheduledTaskLog} from "@/src/api/scheduled-task-api";
import NButton from "@/src/components/NButton";
import {useTranslation} from "react-i18next";
import {getSort} from "@/src/utils/sort";
import {maybe} from "@/src/utils/maybe";
import {CheckCircle, XCircle, Shield, Server, Code, ChevronDown, ChevronUp} from "lucide-react";

const {Text, Title} = Typography;

interface Props {
    open: boolean
    handleCancel: () => void
    jobId: string
}

const ScheduledTaskLogPage = ({open, jobId, handleCancel}: Props) => {

    let {t} = useTranslation();
    const actionRef = useRef<ActionType>();
    let {modal} = App.useApp();

    useEffect(() => {
        if (!open) {
            return;
        }
        actionRef.current?.reload();
    }, [open, jobId]);

    const columns: ProColumns<ScheduledTaskLog>[] = [
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
            render: (_, record) => {
                switch (record.jobType) {
                    case 'asset-check-status':
                        let results = record.results as CheckStatusResult[];
                        let active = results?.filter(item => item.active)?.length;
                        active = maybe(active, 0)
                        let inactive = results?.filter(item => !item.active)?.length;
                        inactive = maybe(inactive, 0)
                        return (
                            <Space align="center" size="small">
                                <Server size={14} style={{ color: '#1890ff' }} />
                                <Text>{t('sysops.logs.asset_status_check')}</Text>
                                <Tag color="green">{t('online')}: {active}</Tag>
                                <Tag color="red">{t('offline')}: {inactive}</Tag>
                            </Space>
                        );
                    case 'asset-exec-command':
                        let results2 = record.results as ExecScriptResult[];
                        let success = results2?.filter(item => item.success)?.length;
                        success = maybe(success, 0)
                        let failed = results2?.filter(item => !item.success)?.length;
                        failed = maybe(failed, 0)
                        return (
                            <Space align="center" size="small">
                                <Code size={14} style={{ color: '#52c41a' }} />
                                <Text>{t('sysops.logs.script_execution')}</Text>
                                {success > 0 && <Tag color="green">{t('general.success')}: {success}</Tag>}
                                {failed > 0 && <Tag color="red">{t('general.failed')}: {failed}</Tag>}
                            </Space>
                        );
                    case 'renew-certificate':
                        let results3 = record.results as RenewCertificateResult[];
                        if (!results3 || results3.length === 0) {
                            return (
                                <Space align="center" size="small">
                                    <Shield size={14} style={{ color: '#faad14' }} />
                                    <Text>{t('sysops.logs.certificate_renewal')}</Text>
                                    <Tag color="blue">{t('sysops.logs.no_certificates_to_renew')}</Tag>
                                </Space>
                            );
                        }
                        let renewSuccess = results3?.filter(item => item.success)?.length;
                        renewSuccess = maybe(renewSuccess, 0)
                        let renewFailed = results3?.filter(item => !item.success)?.length;
                        renewFailed = maybe(renewFailed, 0)
                        return (
                            <Space align="center" size="small">
                                <Shield size={14} style={{ color: '#faad14' }} />
                                <Text>{t('sysops.logs.certificate_renewal')}</Text>
                                {renewSuccess > 0 && <Tag color="green">{t('general.success')}: {renewSuccess}</Tag>}
                                {renewFailed > 0 && <Tag color="orange">{t('sysops.logs.skipped')}: {renewFailed}</Tag>}
                            </Space>
                        );
                }
                return ''
            }
        }
    ]

    const expandedRowRender = (record: ScheduledTaskLog) => {

        const columns = () => {
            switch (record.jobType) {
                case 'asset-check-status':
                    return [
                        {
                            title: t('sysops.logs.asset_name'), 
                            dataIndex: 'name', 
                            key: 'name',
                            render: (text: string) => (
                                <Space align="center" size={4}>
                                    <Server size={12} style={{ color: '#1890ff' }} />
                                    <Text strong>{text}</Text>
                                </Space>
                            )
                        },
                        {
                            title: t('general.status'), 
                            dataIndex: 'active', 
                            key: 'active', 
                            render: (text: any) => {
                                if (text === true) {
                                    return <Tag color="green">{t('online')}</Tag>
                                } else {
                                    return <Tag color="red">{t('offline')}</Tag>
                                }
                            }
                        },
                        {
                            title: t('sysops.logs.used_time'), 
                            dataIndex: 'usedTimeStr', 
                            key: 'usedTimeStr',
                            render: (text: string) => <Text type="secondary">{text}</Text>
                        },
                        {
                            title: t('sysops.logs.reason'),
                            dataIndex: 'error',
                            key: 'error',
                            render: (text: string) => {
                                if (!text) return <Text type="secondary">-</Text>
                                return <Text type="danger">{text}</Text>
                            }
                        },
                    ]
                case 'asset-exec-command':
                    return [
                        {
                            title: t('sysops.logs.asset_name'), 
                            dataIndex: 'name', 
                            key: 'name',
                            render: (text: string) => (
                                <Space align="center" size={4}>
                                    <Code size={12} style={{ color: '#52c41a' }} />
                                    <Text strong>{text}</Text>
                                </Space>
                            )
                        },
                        {
                            title: t('general.status'),
                            dataIndex: 'success',
                            key: 'success',
                            render: (text: any) => {
                                if (text === true) {
                                    return <Tag color="green">{t('general.success')}</Tag>
                                } else {
                                    return <Tag color="red">{t('general.failed')}</Tag>
                                }
                            }
                        },
                        {
                            title: t('sysops.logs.used_time'), 
                            dataIndex: 'usedTimeStr', 
                            key: 'usedTimeStr',
                            render: (text: string) => <Text type="secondary">{text}</Text>
                        },
                        {
                            title: t('sysops.logs.script'),
                            dataIndex: 'script',
                            key: 'script',
                            valueType: 'code',
                        },
                        {
                            title: t('sysops.logs.result'),
                            dataIndex: 'result',
                            key: 'result',
                            valueType: 'code',
                        },
                    ]
                case 'renew-certificate':
                    return [
                        {
                            title: t('sysops.logs.certificate_name'), 
                            dataIndex: 'name', 
                            key: 'name',
                            render: (text: string) => (
                                <Space align="center" size={4}>
                                    <Shield size={12} style={{ color: '#faad14' }} />
                                    <Text strong>{text}</Text>
                                </Space>
                            )
                        },
                        {
                            title: t('general.status'),
                            dataIndex: 'success',
                            key: 'success',
                            render: (text: any) => {
                                if (text === true) {
                                    return <Tag color="green">{t('sysops.logs.renewed')}</Tag>
                                } else {
                                    return <Tag color="orange">{t('sysops.logs.skipped')}</Tag>
                                }
                            }
                        },
                        {
                            title: t('sysops.logs.reason'),
                            dataIndex: 'error',
                            key: 'error',
                            render: (text: string) => {
                                if (!text) return <Text type="secondary">-</Text>
                                return <Text type="warning">{text}</Text>
                            }
                        },
                    ]
            }
        }


        return <ProTable
            size={'small'}
            columns={columns()}
            headerTitle={false}
            search={false}
            options={false}
            dataSource={record.results}
            pagination={false}
        />
    }

    return (
        <Drawer
            title={
                <Space align="center">
                    <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                        {t('sysops.logs.label')}
                    </Title>
                </Space>
            }
            placement="right"
            width={window.innerWidth * 0.9}
            closable={true}
            maskClosable={true}
            onClose={handleCancel}
            open={open}
            styles={{
                body: { 
                    padding: '12px'
                }
            }}
            extra={
                <Space>
                    <Button
                        type="primary"
                        danger
                        onClick={async () => {
                            modal.confirm({
                                title: t('general.clear_confirm'),
                                content: t('sysops.logs.clear_confirm_content'),
                                okText: t('actions.clear'),
                                cancelText: t('actions.cancel'),
                                okType: 'danger',
                                onOk: async () => {
                                    await scheduledTaskApi.clearLog(jobId);
                                    actionRef.current?.reload();
                                }
                            })
                        }}
                    >
                        {t('actions.clear')}
                    </Button>
                </Space>
            }
        >
            <ProTable
                    columns={columns}
                    actionRef={actionRef}
                        request={async (params = {}, sort, filter) => {
                            let [sortOrder, sortField] = getSort(sort);
                            
                            let queryParams = {
                            pageIndex: params.current,
                            pageSize: params.pageSize,
                            name: params.name,
                            sortOrder: sortOrder,
                            sortField: sortField,
                        }
                        let result = await scheduledTaskApi.getLogPaging(jobId, queryParams);
                        let items = result['items'];

                        return {
                            data: items,
                            success: true,
                            total: result['total']
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