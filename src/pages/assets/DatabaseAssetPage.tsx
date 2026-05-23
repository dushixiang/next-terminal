import React, {useState} from 'react';
import {App, Button, Input, Popconfirm, Space, Table, type TableProps, Tag} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import databaseAssetApi, {DatabaseAsset} from "@/api/database-asset-api";
import DatabaseAssetModal from "@/pages/assets/DatabaseAssetModal";
import NButton from "@/components/NButton";
import {getSort} from "@/utils/sort";
import dayjs from "dayjs";

const api = databaseAssetApi;

const DatabaseAssetPage = () => {
    const {t} = useTranslation();
    const {message} = App.useApp();

    const [open, setOpen] = useState(false);
    const [selectedRowKey, setSelectedRowKey] = useState<string>();
    const [pagination, setPagination] = useState({current: 1, pageSize: 10});
    const [sort, setSort] = useState<Record<string, string | null>>({});
    const [keyword, setKeyword] = useState('');

    const databaseAssetPagingQuery = useQuery({
        queryKey: ['database-assets', pagination.current, pagination.pageSize, sort, keyword],
        queryFn: async () => {
            const [sortOrder, sortField] = getSort(sort);
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
        databaseAssetPagingQuery.refetch();
    };

    const postOrUpdate = async (values: any) => {
        if (values['id']) {
            await api.updateById(values['id'], values);
        } else {
            await api.create(values);
        }
    };

    const mutation = useMutation({
        mutationFn: postOrUpdate,
        onSuccess: () => {
            reloadTable();
            setOpen(false);
            setSelectedRowKey(undefined);
            message.success(t('general.success'));
        }
    });

    const handleTableChange: TableProps<DatabaseAsset>['onChange'] = (nextPagination, filters, sorter) => {
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

    const columns: TableProps<DatabaseAsset>['columns'] = [
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
            ellipsis: true,
        },
        {
            title: t('db.asset.type'),
            dataIndex: 'type',
            render: (text) => {
                if (text === 'mysql') {
                    return <Tag color="blue">{t('db.asset.type_mysql')}</Tag>;
                }
                if (text === 'pg') {
                    return <Tag color="purple">{t('db.asset.type_pg')}</Tag>;
                }
                return <Tag>{text}</Tag>;
            },
            width: 120,
        },
        {
            title: t('db.asset.host'),
            dataIndex: 'host',
            render: (_, record) => `${record.host}:${record.port}`,
        },
        {
            title: t('menus.identity.submenus.user'),
            dataIndex: 'username',
        },
        {
            title: t('assets.gateway_type'),
            dataIndex: 'gatewayType',
            render: (text) => {
                if (!text) {
                    return '-';
                }
                if (text === 'ssh') {
                    return t('menus.gateway.submenus.ssh_gateway');
                }
                if (text === 'agent') {
                    return t('menus.gateway.submenus.agent_gateway');
                }
                if (text === 'group') {
                    return t('menus.gateway.submenus.gateway_group');
                }
                return text;
            },
        },
        {
            title: t('assets.tags'),
            dataIndex: 'tags',
            render: (tags) => {
                if (!tags || tags === '-') {
                    return '-';
                }
                return (
                    <>
                        {(tags as string[]).map(tag => (
                            <Tag key={tag}>{tag}</Tag>
                        ))}
                    </>
                );
            },
        },
        {
            title: t('general.created_at'),
            dataIndex: 'createdAt',
            sorter: true,
            width: 190,
            render: (value: number) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
        },
        {
            title: t('actions.label'),
            key: 'option',
            width: 120,
            render: (_text, record) => (
                <Space size={8}>
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

    return (
        <div>
            <div className="overflow-hidden rounded-md bg-white dark:bg-[#141414]">
                <div
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                    <div className="font-medium">{t('menus.resource.submenus.database_asset')}</div>
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
                        <Button loading={databaseAssetPagingQuery.isFetching} onClick={reloadTable}>
                            {t('actions.refresh')}
                        </Button>
                        <Button type="primary" onClick={() => setOpen(true)}>
                            {t('actions.new')}
                        </Button>
                    </Space>
                </div>
                <Table<DatabaseAsset>
                    columns={columns}
                    dataSource={databaseAssetPagingQuery.data?.items || []}
                    loading={databaseAssetPagingQuery.isFetching}
                    rowKey="id"
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: databaseAssetPagingQuery.data?.total || 0,
                        showSizeChanger: true
                    }}
                    onChange={handleTableChange}
                    scroll={{x: 'max-content'}}
                    size="small"
                />
            </div>

            <DatabaseAssetModal
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

export default DatabaseAssetPage;
