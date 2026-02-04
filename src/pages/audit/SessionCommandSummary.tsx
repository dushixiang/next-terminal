import React, {useEffect, useRef} from 'react';
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {Button, Tag} from "antd";
import sessionCommandApi from "@/api/session-command-api";
import strings from "@/utils/strings";
import {SessionCommand} from "@/api/session-api";

interface Props {
    sessionId: string
    onChange: (record?: SessionCommand) => void
}

const SessionCommandSummary = ({sessionId, onChange}: Props) => {
    const {t} = useTranslation();
    const actionRef = useRef<ActionType>(null);

    useEffect(() => {
        if (strings.hasText(sessionId)) {
            actionRef.current?.reload();
        }
    }, [sessionId]);

    if (!strings.hasText(sessionId)) {
        onChange(undefined);
        return <div></div>
    }

    const columns: ProColumns<SessionCommand>[] = [
        {
            title: t('sysops.logs.exec_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            hideInSearch: true,
            valueType: 'dateTime',
            width: 170,
        },
        {
            title: t('audit.risk_level.label'),
            dataIndex: 'riskLevel',
            render: (text, record) => {
                if (text === 1) {
                    return <Tag color="red">{t('audit.risk_level.options.high_risk')}</Tag>
                }
                return <Tag color="blue">{t('audit.risk_level.options.normal')}</Tag>
            },
            hideInSearch: true,
            width: 75,
        },
        {
            title: t('sysops.command'),
            dataIndex: 'command',
            width: 240,
            copyable: true,
            ellipsis: true,
        },
        {
            title: t('actions.label'),
            key: 'action',
            hideInSearch: true,
            width: 60,
            render: (text, record) => (
                <Button
                    type="link"
                    style={{padding: 0, margin: 0}}
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        onChange(record);
                    }}
                >
                    {t('actions.detail')}
                </Button>
            ),
        },
    ];

    return (
        <div>
            <ProTable
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort, filter) => {
                    let [sortOrder, sortField] = getSort(sort);

                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        command: params.keyword,
                        sessionId: sessionId,
                        sortOrder: sortOrder,
                        sortField: sortField,
                    }
                    let result = await sessionCommandApi.getPaging(queryParams);
                    return {
                        data: result['items'],
                        success: true,
                        total: result['total']
                    };
                }}
                rowKey="id"
                search={false}
                options={{
                    search: true,
                }}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true
                }}
                dateFormatter="string"
                headerTitle={t('sysops.command')}
                onRow={(record) => {
                    return {
                        onClick: () => {
                            onChange(record);
                        },
                    };
                }}
            />
        </div>
    );
};

export default SessionCommandSummary;