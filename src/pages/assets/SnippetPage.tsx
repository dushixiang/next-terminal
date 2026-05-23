import React, {useState} from 'react';
import {
    App,
    Button,
    Input,
    Popconfirm,
    Space,
    Table,
    type TableProps,
    Tag,
    Typography} from "antd";
import snippetApi, {Snippet} from "../../api/snippet-api";
import SnippetModal from "./SnippetModal";
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import {useMutation, useQuery} from "@tanstack/react-query";
import NButton from "@/components/NButton";
import dayjs from "dayjs";

const api = snippetApi;

const SnippetPage = () => {

    const {t} = useTranslation();
    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();
    let [pagination, setPagination] = useState({current: 1, pageSize: 10});
    let [sort, setSort] = useState<Record<string, string | null>>({});
    let [keyword, setKeyword] = useState('');

    const {message} = App.useApp();

    const snippetPagingQuery = useQuery({
        queryKey: ['snippets', pagination.current, pagination.pageSize, sort, keyword],
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
        snippetPagingQuery.refetch();
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

    const handleTableChange: TableProps<Snippet>['onChange'] = (nextPagination, filters, sorter) => {
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

    const columns: TableProps<Snippet>['columns'] = [
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
            width: 200,
            ellipsis: true,
        },
        {
            title: t('assets.content'),
            dataIndex: 'content',
            key: 'content',
            ellipsis: true,
            render: (value: string) => (
                <Typography.Text copyable={{text: value}} ellipsis>
                    {value}
                </Typography.Text>
            ),
        },
        {
            title: t('assets.snippet.visibility'),
            dataIndex: 'visibility',
            key: 'visibility',
            width: 100,
            render: (_, record) => {
                return record.visibility === 'public'
                    ? <Tag color="green">{t('assets.snippet.visibility_public')}</Tag>
                    : <Tag color="default">{t('assets.snippet.visibility_private')}</Tag>;
            }
        },
        {
            title: t('general.creator'),
            key: 'creator',
            dataIndex: 'creator',
            width: 200,
            ellipsis: true,
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
            width: 100,
            render: (_text, record) => (
                <Space size={8}>
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
                        <NButton danger={true}>{t('actions.delete')}</NButton>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (<div>
        <div className="overflow-hidden rounded-md bg-white dark:bg-[#141414]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="font-medium">{t('menus.resource.submenus.snippet')}</div>
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
                    <Button loading={snippetPagingQuery.isFetching} onClick={reloadTable}>
                        {t('actions.refresh')}
                    </Button>
                    <Button type="primary" onClick={() => {
                        setOpen(true)
                    }}>
                        {t('actions.new')}
                    </Button>
                </Space>
            </div>
            <Table<Snippet>
                columns={columns}
                dataSource={snippetPagingQuery.data?.items || []}
                loading={snippetPagingQuery.isFetching}
                rowKey="id"
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: snippetPagingQuery.data?.total || 0,
                    showSizeChanger: true
                }}
                onChange={handleTableChange}
                size="small"
            />
        </div>

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
