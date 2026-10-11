import {Button, Descriptions, Modal, Space, Tag, Typography} from "antd";
import {useQuery} from "@tanstack/react-query";
import {useState} from "react";
import {useTranslation} from "react-i18next";
import systemEventApi, {SystemEvent} from "@/api/system-event-api";
import NTable, {NColumn} from "@/components/NTable";
import {getSort} from "@/utils/sort";
import {eventTypeLabel, severities, severityLabel} from "@/pages/sysconf/notification-integration/constants";

import {systemEventText} from './system-event-text';

const {Text} = Typography;

const eventCategories = ['system', 'identity', 'auth', 'access', 'database', 'backup', 'agent'];

const severityColor = (severity: string) => {
    if (severity === 'critical') {
        return 'error';
    }
    if (severity === 'warning') {
        return 'warning';
    }
    return 'default';
};

const formatJSON = (value?: Record<string, any>) => {
    if (!value || Object.keys(value).length === 0) {
        return '-';
    }
    return JSON.stringify(value, null, 2);
};

const SystemEventPage = () => {
    const {t, i18n} = useTranslation();
    const eventText = (event: SystemEvent, field: 'title' | 'summary') =>
        systemEventText(i18n.resolvedLanguage || i18n.language, event[field === 'title' ? 'titleKey' : 'summaryKey'], event.args, event[field]);
    const [selectedId, setSelectedId] = useState<string>();

    const renderActor = (event?: Pick<SystemEvent, 'actor' | 'actorType'>) => {
        if (!event) {
            return '-';
        }
        if (event.actorType === 'system' || (!event.actorType && !event.actor?.trim())) {
            return <Tag>{t('sysops.system_event.actors.system')}</Tag>;
        }
        return event.actor || '-';
    };

    const detailQuery = useQuery({
        queryKey: ['system-event', selectedId],
        queryFn: () => systemEventApi.getById(selectedId || ''),
        enabled: !!selectedId,
    });

    const categoryValueEnum = Object.fromEntries(eventCategories.map(item => [
        item,
        {text: t(`sysops.system_event.categories.${item}`, item)},
    ]));
    const severityValueEnum = Object.fromEntries(severities.map(item => [
        item,
        {text: severityLabel(item, t)},
    ]));

    const columns: NColumn<SystemEvent>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('sysops.system_event.created_at'),
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            hideInSearch: true,
            sorter: true,
            width: 190,
        },
        {
            title: t('sysops.system_event.severity'),
            dataIndex: 'severity',
            valueType: 'select',
            valueEnum: severityValueEnum,
            render: (_text, record) => <Tag color={severityColor(record.severity)}>{severityLabel(record.severity, t)}</Tag>,
            width: 100,
        },
        {
            title: t('sysops.system_event.category'),
            dataIndex: 'category',
            valueType: 'select',
            valueEnum: categoryValueEnum,
            render: (_text, record) => t(`sysops.system_event.categories.${record.category}`, record.category),
            width: 120,
        },
        {
            title: t('sysops.system_event.type'),
            dataIndex: 'type',
            ellipsis: true,
            render: (_text, record) => eventTypeLabel(record.type, t),
        },
        {
            title: t('sysops.system_event.summary'),
            dataIndex: 'summary',
            hideInSearch: true,
            ellipsis: true,
            render: (_text, record) => record.summary || record.summaryKey ? eventText(record, 'summary') : eventText(record, 'title'),
        },
        {
            title: t('sysops.system_event.actor'),
            dataIndex: 'actor',
            ellipsis: true,
            render: (_text, record) => renderActor(record),
            width: 140,
        },
        {
            title: t('sysops.system_event.target'),
            dataIndex: 'target',
            ellipsis: true,
            width: 160,
        },
        {
            title: t('sysops.system_event.source'),
            dataIndex: 'source',
            ellipsis: true,
            width: 130,
        },
        {
            title: t('actions.label'),
            valueType: 'option',
            width: 90,
            render: (_text, record) => <Button size="small" onClick={() => setSelectedId(record.id)}>
                {t('actions.detail')}
            </Button>,
        },
    ];

    const detail = detailQuery.data;

    return <>
        <NTable
            columns={columns}
            request={async (params = {}, sort) => {
                const [sortOrder, sortField] = getSort(sort);
                const actor = params.actor?.trim();
                const systemActor = t('sysops.system_event.actors.system');
                const actorType = actor?.toLocaleLowerCase() === systemActor.toLocaleLowerCase()
                    ? 'system'
                    : undefined;
                const result = await systemEventApi.getPaging({
                    pageIndex: params.current,
                    pageSize: params.pageSize,
                    sortOrder,
                    sortField,
                    type: params.type,
                    category: params.category,
                    severity: params.severity,
                    actor,
                    actorType,
                    target: params.target,
                    source: params.source,
                });
                return {data: result.items, success: true, total: result.total};
            }}
            rowKey="id"
            search={{labelWidth: 'auto'}}
            pagination={{defaultPageSize: 10, showSizeChanger: true}}
            dateFormatter="string"
            headerTitle={t('sysops.system_event.title')}
        />
        <Modal
            title={t('sysops.system_event.detail')}
            open={!!selectedId}
            onCancel={() => setSelectedId(undefined)}
            footer={null}
            width={860}
            destroyOnHidden
        >
            <Descriptions
                column={{xs: 1, sm: 2}}
                bordered
                size="small"
                className="[&_.ant-descriptions-view>table]:table-fixed"
                styles={{
                    label: {width: 120, whiteSpace: 'nowrap'},
                    content: {overflowWrap: 'anywhere'},
                }}
                items={[
                    {key: 'id', label: t('sysops.system_event.id'), span: 2, children: <Text copyable>{detail?.id || '-'}</Text>},
                    {key: 'type', label: t('sysops.system_event.type'), children: detail ? eventTypeLabel(detail.type, t) : '-'},
                    {
                        key: 'severity',
                        label: t('sysops.system_event.severity'),
                        children: detail ? <Tag color={severityColor(detail.severity)}>{severityLabel(detail.severity, t)}</Tag> : '-',
                    },
                    {key: 'category', label: t('sysops.system_event.category'), children: detail ? t(`sysops.system_event.categories.${detail.category}`, detail.category) : '-'},
                    {key: 'source', label: t('sysops.system_event.source'), children: detail?.source || '-'},
                    {key: 'actor', label: t('sysops.system_event.actor'), children: renderActor(detail)},
                    {key: 'target', label: t('sysops.system_event.target'), children: detail?.target || '-'},
                    {key: 'ip', label: t('sysops.system_event.ip'), children: detail?.ip || '-'},
                    {key: 'created-at', label: t('sysops.system_event.created_at'), children: detail?.createdAt ? new Date(detail.createdAt).toLocaleString(i18n.resolvedLanguage || i18n.language) : '-'},
                    {key: 'title', label: t('sysops.system_event.title_field'), span: 2, children: detail ? eventText(detail, 'title') : '-'},
                    {key: 'summary', label: t('sysops.system_event.summary'), span: 2, children: detail ? eventText(detail, 'summary') : '-'},
                    {key: 'args', label: t('sysops.system_event.args'), span: 2, children: <pre className="m-0 max-h-60 overflow-auto whitespace-pre-wrap break-all text-xs">{formatJSON(detail?.args)}</pre>},
                    {key: 'metadata', label: t('sysops.system_event.metadata'), span: 2, children: <pre className="m-0 max-h-60 overflow-auto whitespace-pre-wrap break-all text-xs">{formatJSON(detail?.metadata)}</pre>},
                ]}
            />
            <Space style={{marginTop: 16}}>
                <Button onClick={() => setSelectedId(undefined)}>{t('actions.cancel')}</Button>
            </Space>
        </Modal>
    </>;
};

export default SystemEventPage;
