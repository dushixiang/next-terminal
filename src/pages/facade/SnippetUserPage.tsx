import React, {useRef, useState} from 'react';
import {App, Button, Popconfirm, Tag} from "antd";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import {getSort} from "@/utils/sort";
import {useMutation} from "@tanstack/react-query";
import NButton from "@/components/NButton";
import SnippetUserModal from "@/pages/facade/SnippetUserModal";
import snippetUserApi from "@/api/snippet-user-api";
import {Snippet} from "@/api/snippet-api";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";
import {getCurrentUser} from "@/utils/permission";

const api = snippetUserApi;

const SnippetUserPage = () => {

    const {t} = useTranslation();
    const {isMobile} = useMobile();
    const actionRef = useRef<ActionType>(null);
    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();
    const currentUser = getCurrentUser();

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
            hideInTable: isMobile, // 移动端隐藏序号列
        },
        {
            title: t('assets.name'),
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
            title: '可见性',
            dataIndex: 'visibility',
            key: 'visibility',
            width: isMobile ? 70 : 100,
            hideInSearch: true,
            render: (_, record) => {
                return record.visibility === 'public'
                    ? <Tag color="green">公开</Tag>
                    : <Tag color="default">私有</Tag>;
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
            title: t('actions.option'),
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
                        title={t('general.delete_confirm')}
                        onConfirm={async () => {
                            await api.deleteById(record.id);
                            actionRef.current?.reload();
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
        <div className={cn('py-6 flex', isMobile && 'py-3')}>
            <div className={cn('flex-grow font-bold', isMobile ? 'text-lg' : 'text-xl')}>
                {t('menus.resource.submenus.snippet')}
            </div>
        </div>
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
                collapsed: isMobile, // 移动端默认折叠搜索
                collapseRender: false, // 移动端不显示展开/收起按钮
            }}
            pagination={{
                defaultPageSize: 10,
                showSizeChanger: !isMobile, // 移动端隐藏分页大小选择器
                simple: isMobile, // 移动端使用简单分页
            }}
            dateFormatter="string"
            headerTitle={isMobile ? null : t('menus.resource.submenus.snippet')} // 移动端隐藏标题
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
            tableStyle={{
                padding: isMobile ? '0' : undefined,
            }}
            options={{
                density: !isMobile, // 移动端隐藏密度设置
                fullScreen: !isMobile, // 移动端隐藏全屏按钮
                reload: true,
                setting: !isMobile, // 移动端隐藏列设置
            }}
        />

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