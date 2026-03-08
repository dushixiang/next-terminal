import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from "react-i18next";
import { getSort } from "@/utils/sort";
import { ActionType, ProColumns, ProTable } from "@ant-design/pro-components";
import { App, Button, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import sessionApi, { Session } from "@/api/session-api";
import { renderSize } from "@/utils/utils";
import SessionAuditDrawer from "@/pages/audit/SessionAuditDrawer";
import NButton from "@/components/NButton";
import { useMutation } from "@tanstack/react-query";
import clsx from "clsx";
import { getProtocolColor } from "@/helper/asset-helper";


const OfflineSessionPage = () => {
    const { t } = useTranslation();
    const actionRef = useRef<ActionType>(null);

    const [terminalAuditEnabled, setTerminalAuditEnabled] = useState(false);
    const [auditSessionId, setAuditSessionId] = useState('');
    const [auditOpen, setAuditOpen] = useState(false);
    const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

    const { modal, message } = App.useApp();

    useEffect(() => {
        sessionApi.auditEnabled()
            .then(({ terminalEnabled }) => setTerminalAuditEnabled(terminalEnabled))
            .catch(() => setTerminalAuditEnabled(false));
    }, []);

    const viewAudit = (sessionId: string) => {
        setAuditSessionId(sessionId);
        setAuditOpen(true);
    };

    const triggerAnalysis = async (sessionId: string) => {
        setAnalyzingIds(prev => new Set(prev).add(sessionId));
        try {
            await sessionApi.triggerAudit(sessionId);
            actionRef.current?.reload();
        } catch {
            message.error(t('audit.audit_failed'));
        } finally {
            setAnalyzingIds(prev => {
                const next = new Set(prev);
                next.delete(sessionId);
                return next;
            });
        }
    };

    const batchDeleteMutation = useMutation({
        mutationFn: sessionApi.deleteById,
        onSuccess: () => actionRef.current?.reload(),
    });

    const clearMutation = useMutation({
        mutationFn: sessionApi.clear,
        onSuccess: () => actionRef.current?.reload(),
    });

    const renderAuditStatus = (record: Session) => {
        const isTerminal = record.protocol === 'ssh' || record.protocol === 'telnet';
        const canAudit = record.recordingSize > 0 && isTerminal && terminalAuditEnabled;
        const isAnalyzing = analyzingIds.has(record.id);

        switch (record.auditStatus) {
            case 'pending':
                return (
                    <Tooltip title={t('audit.audit_status.pending_tip')}>
                        <Tag icon={<SyncOutlined spin />} color="processing">
                            {t('audit.audit_status.pending')}
                        </Tag>
                    </Tooltip>
                );
            case 'completed':
                return (
                    <Space size={4}>
                        <Tag color="success">{t('audit.audit_status.completed')}</Tag>
                        <Button
                            type="link"
                            size="small"
                            style={{ padding: 0 }}
                            onClick={() => viewAudit(record.id)}
                        >
                            {t('audit.audit_status.view')}
                        </Button>
                    </Space>
                );
            case 'failed':
                return (
                    <Space size={4}>
                        <Tag color="error">{t('audit.audit_status.failed')}</Tag>
                        {canAudit && (
                            <Button
                                type="link"
                                size="small"
                                danger
                                loading={isAnalyzing}
                                style={{ padding: 0 }}
                                onClick={() => triggerAnalysis(record.id)}
                            >
                                {t('audit.audit_status.retry')}
                            </Button>
                        )}
                    </Space>
                );
            default:
                if (!canAudit) return null;
                return (
                    <Button
                        type="link"
                        size="small"
                        loading={isAnalyzing}
                        style={{ padding: 0 }}
                        onClick={() => triggerAnalysis(record.id)}
                    >
                        {t('audit.audit_status.start')}
                    </Button>
                );
        }
    };

    const columns: ProColumns<Session>[] = [
        {
            title: t('menus.identity.submenus.user'),
            dataIndex: 'userAccount',
            key: 'userAccount',
        },
        {
            title: t('menus.resource.submenus.asset'),
            dataIndex: 'assetName',
            key: 'assetName',
            render: (text, record) => {
                const title = `${record['protocol']} ${record.username}@${record.ip}:${record.port}`;
                return <div>
                    <div>{text}</div>
                    <Typography.Text type="secondary">{title}</Typography.Text>
                </div>;
            },
        },
        {
            title: t('audit.client_ip'),
            dataIndex: 'clientIp',
            key: 'clientIp',
            render: (text, record) => (
                <div className={'flex items-center gap-2'}>
                    <div>{text}</div>
                    <Typography.Text type="secondary">{record.region}</Typography.Text>
                </div>
            ),
        },
        {
            title: t('assets.protocol'),
            dataIndex: 'protocol',
            key: 'protocol',
            sorter: true,
            render: (text, record) => (
                <span
                    className={clsx('rounded-md px-1.5 py-1 text-white font-bold', getProtocolColor(record.protocol))}
                    style={{ fontSize: 9 }}>
                    {record.protocol.toUpperCase()}
                </span>
            ),
            renderFormItem: (item, { type }) => {
                if (type === 'form') return null;
                return (
                    <Select>
                        <Select.Option value="rdp">RDP</Select.Option>
                        <Select.Option value="ssh">SSH</Select.Option>
                        <Select.Option value="telnet">Telnet</Select.Option>
                        <Select.Option value="vnc">VNC</Select.Option>
                        <Select.Option value="kubernetes">Kubernetes</Select.Option>
                    </Select>
                );
            },
        },
        {
            title: t('audit.connected_at'),
            dataIndex: 'connectedAt',
            key: 'connectedAt',
            hideInSearch: true,
            valueType: "dateTime",
        },
        {
            title: t('audit.connection_duration'),
            dataIndex: 'connectionDuration',
            key: 'connectionDuration',
            hideInSearch: true,
        },
        {
            title: t('audit.recording_size'),
            dataIndex: 'recordingSize',
            key: 'recordingSize',
            hideInSearch: true,
            render: (text, record) => {
                const count = record['commandCount'];
                return <div>
                    <div>{renderSize(record['recordingSize'])}</div>
                    {count > 0 && (
                        <Typography.Text type="secondary">
                            {t('sysops.command')} × {count}
                        </Typography.Text>
                    )}
                </div>;
            },
        },
        {
            title: t('audit.audit_status.label'),
            dataIndex: 'auditStatus',
            key: 'auditStatus',
            hideInSearch: true,
            render: (text, record) => renderAuditStatus(record),
        },
        {
            title: t('actions.label'),
            valueType: 'option',
            key: 'option',
            render: (text, record) => {
                const disablePlayback = record.recordingSize <= 0;
                return [
                    <Button
                        key='playback'
                        disabled={disablePlayback}
                        type="link"
                        size='small'
                        onClick={() => {
                            switch (record.protocol) {
                                case 'ssh':
                                case 'telnet':
                                    window.open(`/terminal-playback?sessionId=${record['id']}`, '_blank');
                                    break;
                                case 'rdp':
                                case 'vnc':
                                    window.open(`/graphics-playback?sessionId=${record['id']}`, '_blank');
                                    break;
                            }
                        }}>
                        {t('audit.options.playback')}
                    </Button>,
                    <Popconfirm
                        key='delete-confirm'
                        title={t('general.confirm_delete')}
                        onConfirm={async () => {
                            await sessionApi.deleteById(record.id);
                            actionRef.current?.reload();
                        }}
                    >
                        <NButton danger={true}>{t('actions.delete')}</NButton>
                    </Popconfirm>,
                ];
            },
        },
    ];

    return (
        <div>
            <ProTable
                defaultSize={'small'}
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort) => {
                    const [sortOrder, sortField] = getSort(sort);
                    const result = await sessionApi.getPaging({
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder,
                        sortField,
                        status: 'disconnected',
                        clientIp: params.clientIp,
                        protocol: params.protocol,
                        assetName: params.assetName,
                        userAccount: params.userAccount,
                    });
                    return {
                        data: result['items'],
                        success: true,
                        total: result['total'],
                    };
                }}
                rowKey="id"
                search={{ labelWidth: 'auto' }}
                pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                dateFormatter="string"
                headerTitle={t('menus.log_audit.submenus.offline_session')}
                rowSelection={{
                    selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
                }}
                tableAlertOptionRender={({ selectedRowKeys }) => (
                    <Space size={16}>
                        <NButton
                            danger={true}
                            loading={batchDeleteMutation.isPending}
                            onClick={() => batchDeleteMutation.mutate(selectedRowKeys.join(','))}
                        >
                            {t('actions.delete')}
                        </NButton>
                    </Space>
                )}
                toolBarRender={() => [
                    <Button key="clear" type="primary" danger onClick={() => {
                        modal.confirm({
                            title: t('general.clear_confirm'),
                            onOk: () => clearMutation.mutate(),
                        });
                    }}>
                        {t('actions.clear')}
                    </Button>,
                ]}
                polling={5000}
            />

            <SessionAuditDrawer
                open={auditOpen}
                sessionId={auditSessionId}
                onClose={() => setAuditOpen(false)}
            />
        </div>
    );
};

export default OfflineSessionPage;
