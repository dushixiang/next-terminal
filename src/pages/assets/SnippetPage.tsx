import React, {useRef, useState} from 'react';
import {App, Button, Popconfirm} from "antd";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import snippetApi, {Snippet} from "../../api/snippet-api";
import SnippetModal from "./SnippetModal";
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import {useMutation} from "@tanstack/react-query";
import NButton from "@/components/NButton";

const api = snippetApi;

const SnippetPage = () => {

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

    const columns: ProColumns<Snippet>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('assets.name'),
            dataIndex: 'name',
            width: 200,
            ellipsis: true,
        },
        {
            title: t('assets.content'),
            dataIndex: 'content',
            key: 'content',
            copyable: true,
            ellipsis: true
        },
        {
            title: t('general.creator'),
            key: 'creator',
            dataIndex: 'creator',
            hideInSearch: true,
            width: 200,
            ellipsis: true,
        },
        {
            title: t('general.created_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            hideInSearch: true,
            valueType: 'dateTime',
            width: 191,
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            width: 100,
            render: (text, record, _, action) => [
                <NButton
                    key="edit"
                    onClick={() => {
                        setOpen(true);
                        setSelectedRowKey(record['id']);
                    }}
                >
                    {t('actions.edit')}
                </NButton>,
                <Popconfirm
                    key={'delete-confirm'}
                    title={t('general.delete_confirm')}
                    onConfirm={async () => {
                        await api.deleteById(record.id);
                        actionRef.current?.reload();
                    }}
                >
                    <NButton key='delete' danger={true}>{t('actions.delete')}</NButton>
                </Popconfirm>,
            ],
        },
    ];

    return (<div>
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
            headerTitle={t('menus.resource.submenus.snippet')}
            toolBarRender={() => [
                <Button key="snippet-add" type="primary" onClick={() => {
                    setOpen(true)
                }}>
                    {t('actions.new')}
                </Button>
            ]}
        />

        <SnippetModal
            id={selectedRowKey}
            open={open}
            confirmLoading={mutation.isPending}
            handleCancel={() => {
                setOpen(false);
                setSelectedRowKey(undefined);
            }}
            handleOk={mutation.mutate}
        />
    </div>);
};

export default SnippetPage;