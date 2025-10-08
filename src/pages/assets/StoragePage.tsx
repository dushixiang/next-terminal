import React, {useRef, useState} from 'react';
import {App, Button, Popconfirm, Tag} from "antd";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import storageApi,{Storage} from "@/src/api/storage-api";
import StorageModal from "@/src/pages/assets/StorageModal";
import {renderSize} from "@/src/utils/utils";
import FileSystemPage from "@/src/pages/access/FileSystemPage";
import NButton from "@/src/components/NButton";
import {getSort} from "@/src/utils/sort";

const api = storageApi;

const StoragePage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();
    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>('');

    let [fileSystemOpen, setFileSystemOpen] = useState<boolean>(false);
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

    const columns: ProColumns<Storage>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('assets.name'),
            dataIndex: 'name',
            ellipsis: true,
            width: 100,
        },
        {
            title: t('assets.is_default'),
            dataIndex: 'isDefault',
            key: 'isDefault',
            hideInSearch: true,
            render: (text) => {
                if (text === true) {
                    return <Tag color={'green-inverse'} bordered={false}>{t('general.yes')}</Tag>
                } else {
                    return <Tag color={'gray'} bordered={false}>{t('general.no')}</Tag>
                }
            },
            width: 50,
        },
        {
            title: t('assets.is_share'),
            dataIndex: 'isShare',
            key: 'isShare',
            hideInSearch: true,
            render: (text) => {
                if (text === true) {
                    return <Tag color={'green-inverse'} bordered={false}>{t('general.yes')}</Tag>
                } else {
                    return <Tag color={'gray'} bordered={false}>{t('general.no')}</Tag>
                }
            },
            width: 50,
        },
        {
            title: t('assets.used_size'),
            dataIndex: 'usedSize',
            key: 'usedSize',
            hideInSearch: true,
            render: (text) => {
                return renderSize(text as number);
            },
            width: 100,
        },
        {
            title: t('assets.limit_size'),
            dataIndex: 'limitSize',
            key: 'limitSize',
            hideInSearch: true,
            render: (text) => {
                return renderSize(text as number);
            },
            width: 100,
        },
        {
            title: t('general.creator'),
            key: 'creator',
            dataIndex: 'creator',
            hideInSearch: true,
            width: 100,
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
            width: 200,
            render: (text, record, _, action) => [
                <NButton
                    key="filesystem"
                    onClick={() => {
                        setFileSystemOpen(true);
                        setSelectedRowKey(record['id']);
                    }}
                >
                    {t('assets.filesystem')}
                </NButton>,
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
                    key={'delete_confirm'}
                    title={t('general.delete_confirm')}
                    onConfirm={async () => {
                        await api.deleteById(record.id);
                        actionRef.current?.reload();
                    }}
                >
                    <NButton key='delete' danger={true} disabled={record.isDefault}>{t('actions.delete')}</NButton>
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
            headerTitle={t('menus.resource.submenus.storage')}
            toolBarRender={() => [
                <Button key="button" type="primary" onClick={() => {
                    setOpen(true)
                }}>
                    {t('actions.new')}
                </Button>,
            ]}
        />

        <StorageModal
            id={selectedRowKey}
            open={open}
            confirmLoading={mutation.isPending}
            handleCancel={() => {
                setOpen(false);
                setSelectedRowKey('');
            }}
            handleOk={mutation.mutate}
        />

        <FileSystemPage fsId={selectedRowKey}
                        strategy={{
                            id: 'x',
                            name: 'x',
                            upload: true,
                            download: true,
                            delete: true,
                            rename: true,
                            edit: true,
                            createDir: true,
                            createFile: true,
                            copy: true,
                            paste: true,
                        }}
                        mask={true}
                        maskClosable={true}
                        open={fileSystemOpen}
                        onClose={() => {
                            setFileSystemOpen(false)
                            actionRef.current?.reload();
                        }}/>
    </div>);
};

export default StoragePage;