import React, {useMemo, useState} from 'react';
import {App, Button, Popconfirm, Tag} from "antd";
import {ProColumns, ProTable} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {useMutation, useQuery} from "@tanstack/react-query";
import NButton from "@/components/NButton";
import SnippetUserModal from "@/pages/facade/SnippetUserModal";
import snippetUserApi from "@/api/snippet-user-api";
import {Snippet} from "@/api/snippet-api";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";
import {getCurrentUser} from "@/utils/permission";
import FacadeSearchBar from "@/pages/facade/components/FacadeSearchBar";

const api = snippetUserApi;

const SnippetUserPage = () => {

    const {t} = useTranslation();
    const {isMobile} = useMobile();
    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();
    const [keyword, setKeyword] = useState<string>('');
    const currentUser = getCurrentUser();

    const {message} = App.useApp();

    const snippetsQuery = useQuery({
        queryKey: ['user-snippets'],
        queryFn: () => api.getAll(),
    });

    const filteredSnippets = useMemo(() => {
        const list = snippetsQuery.data || [];
        const value = keyword.trim().toLowerCase();
        if (!value) {
            return list;
        }
        return list.filter((item) => {
            return item.name?.toLowerCase().includes(value)
                || item.content?.toLowerCase().includes(value);
        });
    }, [snippetsQuery.data, keyword]);

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
            setOpen(false);
            setSelectedRowKey(undefined);
            snippetsQuery.refetch();
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
            hideInTable: isMobile, // 移动端隐藏序号列
        },
        {
            title: t('general.name'),
            dataIndex: 'name',
            width: isMobile ? 100 : undefined, // 移动端固定宽度
        },
        {
            title: t('assets.content'),
            dataIndex: 'content',
            key: 'content',
            copyable: true,
            ellipsis: true,
            width: isMobile ? 150 : undefined, // 移动端固定宽度
        },
        {
            title: t('assets.snippet.visibility'),
            dataIndex: 'visibility',
            key: 'visibility',
            width: isMobile ? 70 : 100,
            hideInSearch: true,
            render: (_, record) => {
                return record.visibility === 'public'
                    ? <Tag color="green">{t('assets.snippet.visibility_public')}</Tag>
                    : <Tag color="default">{t('assets.snippet.visibility_private')}</Tag>;
            }
        },
        {
            title: t('general.created_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            hideInSearch: true,
            valueType: 'dateTime',
            hideInTable: isMobile, // 移动端隐藏创建时间
        },
        {
            title: t('actions.label'),
            valueType: 'option',
            key: 'option',
            width: isMobile ? 80 : undefined, // 移动端固定宽度
            render: (text, record, _, action) => {
                // 只有创建者才能编辑和删除
                const isOwner = record.createdBy === currentUser.id;

                if (!isOwner) {
                    return null;
                }

                return [
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
                        title={t('general.confirm_delete')}
                        onConfirm={async () => {
                            await api.deleteById(record.id);
                            snippetsQuery.refetch();
                        }}
                    >
                        <NButton
                            key='delete'
                            danger={true}
                        >
                            {t('actions.delete')}
                        </NButton>
                    </Popconfirm>,
                ];
            },
        },
    ];

    return (<div className={cn('px-4 lg:px-20', isMobile && 'px-2')}>
        <div className={cn('py-6', isMobile && 'p-4')}>
            <div className={'rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-4 lg:p-5'}>
                <div className={'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'}>
                    <div className={'flex flex-col gap-1'}>
                        <div className={'text-xl font-bold text-slate-900 dark:text-slate-100'}>
                            {t('menus.resource.submenus.snippet')}
                        </div>
                    </div>
                </div>
                <div className={'pt-3'}>
                    <FacadeSearchBar
                        value={keyword}
                        onChange={setKeyword}
                        resultCount={filteredSnippets.length}
                        totalCount={snippetsQuery.data?.length || 0}
                    />
                </div>
            </div>
        </div>
        <div className={'rounded-xl ring-1 ring-slate-200/60 dark:ring-slate-700/60 p-1'}>
            <ProTable
                columns={columns}
                dataSource={filteredSnippets}
                loading={snippetsQuery.isFetching}
                rowKey="id"
                search={false}
                pagination={false}
                dateFormatter="string"
                headerTitle={null}
                toolBarRender={() => [
                    <Button
                        key="button"
                        type="primary"
                        size={isMobile ? 'middle' : 'middle'}
                        onClick={() => {
                            setOpen(true)
                        }}
                    >
                        {t('actions.new')}
                    </Button>,
                ]}
                options={{
                    density: !isMobile, // 移动端隐藏密度设置
                    fullScreen: !isMobile, // 移动端隐藏全屏按钮
                    reload: false,
                    setting: !isMobile, // 移动端隐藏列设置
                }}
            />
        </div>

        <SnippetUserModal
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

export default SnippetUserPage;
