import React, {useRef, useState} from 'react';
import {App, Button, Popconfirm} from "antd";
import {ActionType, ProColumns, ProTable, TableDropdown} from "@ant-design/pro-components";
import {useNavigate} from "react-router-dom";
import commandFilterApi, {CommandFilter} from '@/src/api/command-filter-api';
import CommandFilterModal from "@/src/pages/authorised/CommandFilterModal";
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import NLink from "@/src/components/NLink";
import NButton from "@/src/components/NButton";

const api = commandFilterApi;

const CommandFilterPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();

    const {message} = App.useApp();

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
            setSelectedRowKey(undefined);
            setOpen(false);
            actionRef.current?.reload();
        }
    });

    function showSuccess() {
        message.open({
            type: 'success',
            content: t('general.success'),
        });
    }

    let navigate = useNavigate();

    const columns: ProColumns<CommandFilter>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('authorised.command_filter.name'),
            dataIndex: 'name',
            render: (text, record) => {
                return <NLink to={`/command-filter/${record['id']}`}>{text}</NLink>;
            },
        },
        {
            title: t('general.created_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            hideInSearch: true,
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
                <TableDropdown
                    key="actionGroup"
                    onSelect={(key) => {
                        switch (key) {
                            case 'command-filter-detail':
                                navigate(`/command-filter/${record['id']}?activeKey=info`);
                                break;
                            case 'command-filter-rule':
                                navigate(`/command-filter/${record['id']}?activeKey=rules`);
                                break;
                        }
                    }}
                    menus={[
                        {key: 'command-filter-detail', name: t('actions.detail')},
                        {key: 'command-filter-rule', name: t('authorised.command_filter.options.rule')},
                    ]}
                />,
            ],
        },
    ];

    return (
        <div>
            <ProTable
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort, filter) => {

                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sort: JSON.stringify(sort),
                        name: params.name,
                    }
                    let result = await api.getPaging(queryParams);
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
                headerTitle={t('menus.authorised.submenus.command_filter')}
                toolBarRender={() => [
                    <Button key="button" type="primary" onClick={() => {
                        setOpen(true)
                    }}>
                        {t('actions.new')}
                    </Button>
                    ,
                ]}
            />

            <CommandFilterModal
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
}

export default CommandFilterPage;