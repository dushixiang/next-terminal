import React, {useRef, useState} from 'react';

import {App, Button, Popconfirm, Tag} from "antd";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import strategyApi, {Strategy} from '@/src/api/strategy-api';
import {useTranslation} from "react-i18next";
import {getSort} from "@/src/utils/sort";
import StrategyModal from "@/src/pages/authorised/StrategyModal";
import {useMutation} from "@tanstack/react-query";
import NButton from "@/src/components/NButton";

const api = strategyApi;

const StrategyPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();

    const renderStatus = (text: any) => {
        if (text === true) {
            return <Tag color={'green'} bordered={false}>{t('general.enabled')}</Tag>
        } else {
            return <Tag color={'red'} bordered={false}>{t('general.disabled')}</Tag>
        }
    }

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

    const columns: ProColumns<Strategy>[] = [{
        dataIndex: 'index',
        valueType: 'indexBorder',
        width: 48,
    }, {
        title: t('authorised.strategy.name'),
        dataIndex: 'name',
        key: 'name',
        sorter: true,
    }, {
        title: t('authorised.strategy.upload'),
        dataIndex: 'upload',
        key: 'upload',
        hideInSearch: true,
        render: (text) => {
            return renderStatus(text);
        }
    }, {
        title: t('authorised.strategy.download'),
        dataIndex: 'download',
        key: 'download',
        hideInSearch: true,
        render: (text) => {
            return renderStatus(text);
        }
    }, {
        title: t('authorised.strategy.edit'),
        dataIndex: 'edit',
        key: 'edit',
        hideInSearch: true,
        render: (text) => {
            return renderStatus(text);
        }
    }, {
        title: t('authorised.strategy.remove'),
        dataIndex: 'delete',
        key: 'delete',
        hideInSearch: true,
        render: (text) => {
            return renderStatus(text);
        }
    }, {
        title: t('authorised.strategy.rename'),
        dataIndex: 'rename',
        key: 'rename',
        hideInSearch: true,
        render: (text) => {
            return renderStatus(text);
        }
    }, {
        title: t('authorised.strategy.copy'),
        dataIndex: 'copy',
        key: 'copy',
        hideInSearch: true,
        render: (text) => {
            return renderStatus(text);
        }
    }, {
        title: t('authorised.strategy.paste'),
        dataIndex: 'paste',
        key: 'paste',
        hideInSearch: true,
        render: (text) => {
            return renderStatus(text);
        }
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
                        setSelectedRowKey(record.id);
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
                headerTitle={t('menus.authorised.submenus.strategy')}
                toolBarRender={() => [
                    <Button key="button" type="primary" onClick={() => {
                        setOpen(true)
                    }}>
                        {t('actions.new')}
                    </Button>
                    ,
                ]}
            />

            <StrategyModal
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

export default StrategyPage;
