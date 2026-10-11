import {useRef} from "react";
import {useMutation} from "@tanstack/react-query";
import {App, Button, Popconfirm, Space, Tag, Tooltip, Typography} from "antd";
import {notificationDeliveryApi, NotificationDelivery} from "@/api/notification-api";
import NTable, {NColumn, type NTableActionType} from "@/components/NTable";
import {getSort} from "@/utils/sort";
import {channelTypeLabel, eventTypeLabel, severities, severityLabel} from "./constants";
import {useTranslation} from "react-i18next";

const NotificationDeliveries = () => {
    const {t} = useTranslation();
    const {modal} = App.useApp();
    const actionRef = useRef<NTableActionType>(null);

    const deleteMutation = useMutation({
        mutationFn: (id: string) => notificationDeliveryApi.deleteById(id),
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });

    const clearMutation = useMutation({
        mutationFn: notificationDeliveryApi.clear,
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });

    const columns: NColumn<NotificationDelivery>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('settings.notification.event_type'),
            dataIndex: 'eventType',
            render: (_text, record) => eventTypeLabel(record.eventType, t),
        },
        {
            title: t('settings.notification.severity'),
            dataIndex: 'severity',
            valueType: 'select',
            valueEnum: severities.reduce((acc: any, item) => {
                acc[item] = {text: severityLabel(item, t)};
                return acc;
            }, {}),
            render: (_text, record) => <Tag>{severityLabel(record.severity, t)}</Tag>,
        },
        {
            title: t('settings.notification.channel'),
            dataIndex: 'channelId',
            hideInSearch: true,
            ellipsis: true,
            render: (_text, record) => record.channelId === 'personal-mail' ? t('settings.notification.personal_mail') : channelTypeLabel(record.channelId, t),
        },
        {
            title: t('settings.notification.recipient'), dataIndex: 'recipientId', hideInSearch: true,
            render: (_text, record) => record.request?.recipientName || record.recipientId || '-',
        },
        {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            hideInSearch: true,
            width: 191,
        },
        {
            title: t('settings.notification.result'),
            dataIndex: 'result',
            hideInSearch: true,
            ellipsis: true,
            render: (_text, record) => {
                if (record.recipientId && record.result === 'skipped') return <Tooltip title={t(`settings.notification.skip_reasons.${record.skipReason || 'record_or_permission_changed'}`)}>{t('settings.notification.personal_skipped')}</Tooltip>;
                if (record.recipientId && record.nextRetryAt) return t('settings.notification.personal_queued');
                if (record.recipientId && record.sentAt && !record.error) return t('general.success');
                if (record.recipientId && record.error) return t('settings.notification.personal_failed');
                if (!record.result) {
                    return '-';
                }
                return (
                    <Tooltip title={record.result} placement="topLeft">
                        <Typography.Text ellipsis style={{maxWidth: 360}}>{record.result}</Typography.Text>
                    </Tooltip>
                );
            },
        },
        {
            title: t('settings.notification.error'),
            dataIndex: 'error',
            hideInSearch: true,
            ellipsis: true,
            render: (_text, record) => record.error ? <Typography.Text type="danger">{record.error}</Typography.Text> : '-',
        },
        {
            title: t('actions.label'),
            dataIndex: 'option',
            valueType: 'option',
            width: 90,
            render: (_text, record) => (
                <Space size={8}>
                    <Popconfirm
                        title={t('general.confirm_delete')}
                        onConfirm={() => deleteMutation.mutate(record.id)}
                    >
                        <Button type="link" danger size="small" loading={deleteMutation.isPending}>
                            {t('actions.delete')}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return <NTable
        columns={columns}
        actionRef={actionRef}
        request={async (params = {}, sort) => {
            const [sortOrder, sortField] = getSort(sort);
            const result = await notificationDeliveryApi.getPaging({
                pageIndex: params.current,
                pageSize: params.pageSize,
                sortOrder,
                sortField,
                eventType: params.eventType,
                severity: params.severity,
            });
            return {data: result.items, success: true, total: result.total};
        }}
        rowKey="id"
        search={{labelWidth: 'auto'}}
        scroll={{x: 'max-content'}}
        pagination={{defaultPageSize: 10, showSizeChanger: true}}
        dateFormatter="string"
        headerTitle={t('settings.notification.deliveries')}
        toolBarRender={() => [
            <Button
                key="clear"
                type="primary"
                danger
                loading={clearMutation.isPending}
                onClick={() => {
                    modal.confirm({
                        title: t('general.clear_confirm'),
                        onOk: async () => {
                            return clearMutation.mutate();
                        }
                    });
                }}
            >
                {t('actions.clear')}
            </Button>
        ]}
    />;
};

export default NotificationDeliveries;
