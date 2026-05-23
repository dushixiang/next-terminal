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
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import storageApi, {Storage} from "@/api/storage-api";
import StorageModal from "@/pages/assets/StorageModal";
import {renderSize} from "@/utils/utils";
import FileSystemPage from "@/pages/access/FileSystemPage";
import NButton from "@/components/NButton";
import {getSort} from "@/utils/sort";
import dayjs from "dayjs";

const api = storageApi;

const StoragePage = () => {

    const {t} = useTranslation();
    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>('');
    let [pagination, setPagination] = useState({current: 1, pageSize: 10});
    let [sort, setSort] = useState<Record<string, string | null>>({});
    let [keyword, setKeyword] = useState('');

    let [fileSystemOpen, setFileSystemOpen] = useState<boolean>(false);
    const {message} = App.useApp();

    const storagePagingQuery = useQuery({
        queryKey: ['storages', pagination.current, pagination.pageSize, sort, keyword],
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
        storagePagingQuery.refetch();
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

    const handleTableChange: TableProps<Storage>['onChange'] = (nextPagination, filters, sorter) => {
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

    const columns: TableProps<Storage>['columns'] = [
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
            width: 100,
        },
        {
            title: t('general.default'),
            dataIndex: 'isDefault',
            key: 'isDefault',
            render: (text) => {
                if (text === true) {
                    return <Tag color={'green'} variant="solid">{t('general.yes')}</Tag>
                } else {
                    return <Tag color={'gray'} variant="filled">{t('general.no')}</Tag>
                }
            },
            width: 50,
        },
        {
            title: t('assets.is_share'),
            dataIndex: 'isShare',
            key: 'isShare',
            render: (text) => {
                if (text === true) {
                    return <Tag color={'green'} variant="solid">{t('general.yes')}</Tag>
                } else {
                    return <Tag color={'gray'} variant="filled">{t('general.no')}</Tag>
                }
            },
            width: 50,
        },
        {
            title: t('assets.used_size'),
            dataIndex: 'usedSize',
            key: 'usedSize',
            render: (text) => {
                return renderSize(text as number);
            },
            width: 100,
        },
        {
            title: t('assets.limit_size'),
            dataIndex: 'limitSize',
            key: 'limitSize',
            render: (text) => {
                return renderSize(text as number);
            },
            width: 100,
        },
        {
            title: t('general.creator'),
            key: 'creator',
            dataIndex: 'creator',
            width: 100,
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
            width: 200,
            render: (_text, record) => (
                <Space size={8}>
                    <NButton
                        onClick={() => {
                            setFileSystemOpen(true);
                            setSelectedRowKey(record['id']);
                        }}
                    >
                        {t('assets.filesystem')}
                    </NButton>
                    <NButton
                        onClick={() => {
                            setOpen(true);
                            setSelectedRowKey(record['id']);
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
                        <NButton danger={true} disabled={record.isDefault}>{t('actions.delete')}</NButton>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (<div>
        <div className="overflow-hidden rounded-md bg-white dark:bg-[#141414]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="font-medium">{t('menus.resource.submenus.storage')}</div>
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
                    <Button loading={storagePagingQuery.isFetching} onClick={reloadTable}>
                        {t('actions.refresh')}
                    </Button>
                    <Button type="primary" onClick={() => {
                        setOpen(true)
                    }}>
                        {t('actions.new')}
                    </Button>
                </Space>
            </div>
            <Table<Storage>
                columns={columns}
                dataSource={storagePagingQuery.data?.items || []}
                loading={storagePagingQuery.isFetching}
                rowKey="id"
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: storagePagingQuery.data?.total || 0,
                    showSizeChanger: true
                }}
                onChange={handleTableChange}
                scroll={{x: 'max-content'}}
                size="small"
            />
        </div>

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
                            reloadTable();
                        }}/>
    </div>);
};

export default StoragePage;
