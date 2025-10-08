import React, {useRef, useState} from 'react';
import {App, Badge, Button, Popconfirm, Tag} from "antd";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import commandFilterRuleApi, {CommandFilterRule} from "../../api/command-filter-rule-api.js";
import CommandFilterRuleModal from "./CommandFilterRuleModal";
import {useTranslation} from "react-i18next";
import {getSort} from "@/src/utils/sort";
import {useMutation} from "@tanstack/react-query";
import NButton from "@/src/components/NButton";

const api = commandFilterRuleApi;

interface Props {
    id: string
}

const CommandFilterRulePage = ({id}: Props) => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();

    const {message} = App.useApp();

    const postOrUpdate = async (values: any) => {
        values['commandFilterId'] = id
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
            setSelectedRowKey(undefined);
            showSuccess();
        }
    });

    function showSuccess() {
        message.open({
            type: 'success',
            content: t('general.success'),
        });
    }

    const columns: ProColumns<CommandFilterRule>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('authorised.command_filter.rule.priority'),
            key: 'priority',
            dataIndex: 'priority',
            sorter: true,
            hideInSearch: true,
        },
        {
            title: t('authorised.command_filter.rule.type.label'),
            key: 'type',
            dataIndex: 'type',
            hideInSearch: true,
            render: (text => {
                if (text === 'regexp') {
                    return <Tag color={'blue'}>{t('authorised.command_filter.rule.type.options.regexp')}</Tag>;
                } else {
                    return <Tag color={'geekblue'}>{t('authorised.command_filter.rule.type.options.command')}</Tag>;
                }
            })
        },
        {
            title: t('authorised.command_filter.rule.match_content'),
            key: 'command',
            dataIndex: 'command',
            sorter: true,
        },
        {
            title: t('authorised.command_filter.rule.action.label'),
            key: 'action',
            dataIndex: 'action',
            hideInSearch: true,
            render: (text => {
                switch (text) {
                    case 'allow':
                        return <Tag color={'green'}>{t('authorised.command_filter.rule.action.options.allow')}</Tag>
                    case 'reject':
                        return <Tag color={'red'}>{t('authorised.command_filter.rule.action.options.reject')}</Tag>
                }
            })
        },
        {
            title: t('authorised.command_filter.rule.status'),
            key: 'enabled',
            dataIndex: 'enabled',
            hideInSearch: true,
            render: (text => {
                if (text === true) {
                    return <Badge status="processing" text={t('general.enabled')}/>;
                } else {
                    return <Badge status="default" text={t('general.disabled')}/>;
                }
            })
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            render: (text, record, _, action) => [
                <NButton
                    key="edit"
                    onClick={() => {
                        setOpen(true);
                        setSelectedRowKey(record['id']);
                    }}
                >
                    {t('actions.edit')}
                </NButton>
                ,
                <Popconfirm
                    key={'delete-confirm'}
                    title={t('general.delete_confirm')}
                    onConfirm={async () => {
                        await api.deleteById(record.id);
                        actionRef.current?.reload();
                    }}
                >
                    <NButton key='delete' danger={true}>{t('actions.delete')}</NButton>
                </Popconfirm>
                ,
            ],
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
                        sortOrder: sortOrder,
                        sortField: sortField,
                        name: params.name,
                        commandFilterId: id,
                    }
                    let result = await commandFilterRuleApi.getPaging(queryParams);
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
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true
                }}
                dateFormatter="string"
                headerTitle={t('authorised.command_filter.options.rule')}
                toolBarRender={() => [
                    <Button key="button" type="primary" onClick={() => {
                        setOpen(true);
                    }}>
                        {t('actions.new')}
                    </Button>
                    ,
                ]}
            />

            <CommandFilterRuleModal
                id={selectedRowKey}
                open={open}
                confirmLoading={mutation.isPending}
                handleCancel={() => {
                    setOpen(false);
                    setSelectedRowKey(undefined);
                }}
                handleOk={mutation.mutate}
            />
        </div>
    );
};

export default CommandFilterRulePage;