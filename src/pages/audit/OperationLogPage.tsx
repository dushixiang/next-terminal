import operationLogApi,{ OperationLog,OperationLogOption } from "@/api/operation-log-api";
import IPRegion from "@/components/IPRegion";
import NTable,{ type NColumn,type NTableActionType } from "@/components/NTable";
import { getSort } from "@/utils/sort";
import { useQuery } from "@tanstack/react-query";
import {
    DatePicker,
    Space,
    Tag,
    Tooltip,
    Typography
} from 'antd';
import dayjs from "dayjs";
import { useRef } from 'react';
import { useTranslation } from "react-i18next";

const {Text} = Typography;

const actionColor = (action: string) => {
    if (['create','enable','approve','allow','authorize','upload','import','share'].includes(action)) {
        return 'green';
    }
    if (['delete','disable','reject','revoke','clear','disconnect','cancel-share'].includes(action)) {
        return 'red';
    }
    if (['reset-password','reset-otp','renew','generate','execute','audit','test'].includes(action)) {
        return 'purple';
    }
    return 'blue';
};

const normalizeKey = (key: string) => key.replaceAll('-', '_');

const translateWithFallback = (t: (key: string) => string, key: string, fallback: string) => {
    const text = t(key);
    return text === key ? fallback : text;
};

const valueEnumFromOptions = (options: OperationLogOption[], label: (key: string) => string) => {
    return Object.fromEntries(options.map(item => [item.value, {text: label(item.value)}]));
};

const OperationLogPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<NTableActionType>(null);

    const optionsQuery = useQuery({
        queryKey: ['operation-log-options'],
        queryFn: operationLogApi.options,
        refetchOnWindowFocus: false,
    });

    const moduleLabel = (key: string) => translateWithFallback(
        t,
        'audit.operation.modules.' + normalizeKey(key),
        translateWithFallback(t, 'menus.' + normalizeKey(key) + '.label', key),
    );
    const resourceLabel = (key: string) => {
        const auditPath = 'audit.operation.resources.' + normalizeKey(key);
        const auditLabel = t(auditPath);
        if (auditLabel !== auditPath) {
            return auditLabel;
        }
        for (const moduleKey of optionsQuery.data?.modules || []) {
            const path = 'menus.' + normalizeKey(moduleKey.value) + '.submenus.' + normalizeKey(key);
            const text = t(path);
            if (text !== path) {
                return text;
            }
        }
        return translateWithFallback(t, 'audit.operation.resources.' + normalizeKey(key), key);
    };
    const actionLabel = (key: string) => translateWithFallback(t, 'audit.operation.actions.' + normalizeKey(key), key);

    const moduleValueEnum = valueEnumFromOptions(optionsQuery.data?.modules || [], moduleLabel);
    const resourceValueEnum = valueEnumFromOptions(optionsQuery.data?.resources || [], resourceLabel);
    const actionValueEnum = valueEnumFromOptions(optionsQuery.data?.actions || [], actionLabel);

    const columns: NColumn<OperationLog>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('audit.operation.account'),
            dataIndex: 'accountName',
            key: 'accountName',
            width: 120,
        },
        {
            title: t('audit.operation.module'),
            dataIndex: 'module',
            key: 'module',
            valueEnum: moduleValueEnum,
            render: (_, record) => <Tag color="geekblue">{moduleLabel(record.module)}</Tag>,
            width: 110,
        },
        {
            title: t('audit.operation.resource'),
            dataIndex: 'resource',
            key: 'resource',
            valueEnum: resourceValueEnum,
            render: (_, record) => resourceLabel(record.resource),
            width: 150,
        },
        {
            title: t('audit.action'),
            dataIndex: 'action',
            key: 'action',
            valueEnum: actionValueEnum,
            render: (_, record) => (
                <Tag color={actionColor(record.action)}>
                    {actionLabel(record.action)}
                </Tag>
            ),
            width: 120,
        },
        {
            title: t('general.status'),
            dataIndex: 'status',
            key: 'status',
            valueEnum: {
                success: {text: t('general.success')},
                failed: {text: t('general.failed')},
            },
            render: (_, record) => {
                if (record.status === 'failed') {
                    return <Tooltip title={record.errorMessage}>
                        <Tag color="error">{t('general.failed')}</Tag>
                    </Tooltip>
                }
                return <Tag color="success">{t('general.success')}</Tag>;
            },
            width: 90,
        },
        {
            title: <span style={{whiteSpace: 'nowrap'}}>{t('audit.client_ip')}</span>,
            dataIndex: 'clientIp',
            key: 'clientIp',
            render: (_, record) => <IPRegion ip={record.clientIp} regionInfo={record.regionInfo}/>,
            width: 180,
        },
        {
            title: t('audit.operation.request'),
            dataIndex: 'requestPath',
            key: 'requestPath',
            hideInSearch: true,
            render: (_, record) => {
                const requestText = `${record.requestMethod || ''} ${record.requestPath || ''}`.trim();
                return (
                    <Tooltip title={requestText}>
                        <Space size={4} wrap={false}>
                            <Tag>{record.requestMethod}</Tag>
                            <Text ellipsis style={{maxWidth: 260}}>{record.requestPath}</Text>
                        </Space>
                    </Tooltip>
                );
            },
            width: 340,
        },
        {
            title: <span style={{whiteSpace: 'nowrap'}}>{t('audit.user_agent')}</span>,
            dataIndex: 'userAgent',
            key: 'userAgent',
            hideInSearch: true,
            render: (_, record) => {
                let userAgent = record.userAgent;
                if (!userAgent) {
                    return '-';
                }
                return (
                    <span style={{whiteSpace: 'nowrap'}}>
                        {`${userAgent?.OS} ${userAgent?.OSVersion} ${userAgent?.Name} ${userAgent?.Version}`}
                    </span>
                );
            },
            width: 220,
        }, {
            title: t('audit.operation.at'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            valueType: 'dateTime',
            sorter: true,
            renderFormItem: () => <DatePicker.RangePicker showTime/>,
            formItemProps: {
                name: 'createdAtRange',
            },
            width: 180,
        }
    ];

    return (
        <div>
            <NTable
                defaultSize={'small'}
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort, _filter) => {
                    let [sortOrder, sortField] = getSort(sort);
                    const range = params.createdAtRange || [];
                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sortOrder: sortOrder,
                        sortField: sortField,
                        accountName: params.accountName,
                        clientIp: params.clientIp,
                        module: params.module,
                        resource: params.resource,
                        action: params.action,
                        status: params.status,
                        startAt: range[0] ? dayjs(range[0]).valueOf() : undefined,
                        endAt: range[1] ? dayjs(range[1]).valueOf() : undefined,
                    }
                    let result = await operationLogApi.getPaging(queryParams);
                    return {
                        data: result['items'],
                        success: true,
                        total: result['total']
                    };
                }}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                }}
                scroll={{
                    x: 'max-content'
                }}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true
                }}
                dateFormatter="string"
                headerTitle={t('menus.log_audit.submenus.operation_log')}
            />
        </div>
    );
};

export default OperationLogPage;
