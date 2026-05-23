import React, {useState} from 'react';

import {
    App,
    Button,
    Input,
    Popconfirm,
    Space,
    Table,
    type TableProps,
    Tag} from "antd";
import CredentialModal from "./CredentialModal";
import credentialApi, {Credential} from '../../api/credential-api';
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import {useMutation, useQuery} from "@tanstack/react-query";
import NButton from "@/components/NButton";
import copy from "copy-to-clipboard";
import dayjs from "dayjs";

const api = credentialApi;

const CredentialPage = () => {

    const {t} = useTranslation();

    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();
    let [pagination, setPagination] = useState({current: 1, pageSize: 10});
    let [sort, setSort] = useState<Record<string, string | null>>({});
    let [keyword, setKeyword] = useState('');

    const {message} = App.useApp();

    const credentialPagingQuery = useQuery({
        queryKey: ['credentials', pagination.current, pagination.pageSize, sort, keyword],
        queryFn: async () => {
            let [sortOrder, sortField] = getSort(sort);
            return api.getPaging({
                pageIndex: pagination.current,
                pageSize: pagination.pageSize,
                sortOrder: sortOrder,
                sortField: sortField,
                keyword: keyword || undefined,
            });
        },
        refetchOnWindowFocus: false,
    });

    const reloadTable = () => {
        credentialPagingQuery.refetch();
    };

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
            reloadTable();
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

    const handleTableChange: TableProps<Credential>['onChange'] = (nextPagination, filters, sorter) => {
        const activeSorter = Array.isArray(sorter) ? sorter.find((item) => item.order) : sorter;
        const field = activeSorter?.field;
        const fieldName = Array.isArray(field) ? field.join('.') : field ? String(field) : '';
        setSort(activeSorter?.order && fieldName ? {[fieldName]: activeSorter.order} : {});
        setPagination((prev) => ({
            ...prev,
            current: nextPagination.current || 1,
            pageSize: nextPagination.pageSize || prev.pageSize,
        }));
    };

    const columns: TableProps<Credential>['columns'] = [
        {
            title: '#',
            key: 'index',
            width: 48,
            render: (_value, _record, index) => {
                return ((pagination.current - 1) * pagination.pageSize) + index + 1;
            },
        },
        {
            title: t('general.name'),
            dataIndex: 'name',
        }, {
            title: t('assets.type'),
            dataIndex: 'type',
            key: 'type',
            render: (type) => {
                if (type === 'private-key') {
                    return (
                        <Tag color="green">{t('assets.private_key')}</Tag>
                    );
                } else {
                    return (
                        <Tag color="red">{t('assets.password')}</Tag>
                    );
                }
            }
        }, {
            title: t('menus.identity.submenus.user'),
            dataIndex: 'username',
            key: 'username',
        }, {
            title: t('assets.asset_count'),
            dataIndex: 'assetCount',
            key: 'assetCount',
            width: 120,
        },
        {
            title: t('general.created_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            sorter: true,
            width: 191,
            render: (value: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: t('actions.label'),
            key: 'option',
            width: 150,
            render: (_text, record) => (
                <Space size={8}>
                    <NButton
                        disabled={record.type !== 'private-key'}
                        onClick={async () => {
                            let publicKey = await credentialApi.getPublicKey(record.id);
                            copy(publicKey);
                            showSuccess();
                        }}
                    >
                        {t('assets.copy_public_key')}
                    </NButton>
                    <NButton
                        onClick={() => {
                            setOpen(true);
                            setSelectedRowKey(record.id);
                        }}
                    >
                        {t('actions.edit')}
                    </NButton>
                    <Popconfirm
                        title={t('general.confirm_delete')}
                        onConfirm={async () => {
                            await api.deleteById(record.id);
                            reloadTable();
                        }}
                    >
                        <NButton danger={true}>{t('actions.delete')}</NButton>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (<div className="">
        <div className="overflow-hidden rounded-md bg-white dark:bg-[#141414]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="font-medium">{t('menus.resource.submenus.credential')}</div>
                <Space wrap>
                    <Input.Search
                        allowClear
                        placeholder={t('general.search_placeholder')}
                        onSearch={(value) => {
                            setKeyword(value.trim());
                            setPagination((prev) => ({...prev, current: 1}));
                        }}
                        style={{width: 240}}
                    />
                    <Button loading={credentialPagingQuery.isFetching} onClick={reloadTable}>
                        {t('actions.refresh')}
                    </Button>
                    <Button type="primary" onClick={() => {
                        setOpen(true)
                    }}>
                        {t('actions.new')}
                    </Button>
                </Space>
            </div>
            <Table<Credential>
                columns={columns}
                dataSource={credentialPagingQuery.data?.items || []}
                loading={credentialPagingQuery.isFetching}
                rowKey="id"
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: credentialPagingQuery.data?.total || 0,
                    showSizeChanger: true
                }}
                onChange={handleTableChange}
                scroll={{x: 'max-content'}}
                size="small"
            />
        </div>

        <CredentialModal
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
}

export default CredentialPage;
