import React, {useRef, useState} from 'react';

import {App, Button, Popconfirm} from "antd";
import {Link} from "react-router-dom";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import RoleModal from "./RoleModal";
import roleApi, {Role} from "../../api/role-api";
import {useTranslation} from "react-i18next";
import {getSort} from "@/src/utils/sort";
import {useMutation} from "@tanstack/react-query";
import NButton from "../../components/NButton";
import NLink from "@/src/components/NLink";
import {useLicense} from "@/src/hook/use-license";
import Disabled from "@/src/components/Disabled";

const api = roleApi;

const RolePage = () => {

    let [license] = useLicense();
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

    const columns: ProColumns<Role>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('general.name'),
            dataIndex: 'name',
            render: (text, record) => {
                return <NLink to={`/role/${record['id']}`}>{text}</NLink>;
            },
        },
        {
            title: t('identity.role.type'),
            dataIndex: 'type',
            valueType: 'radio',
            sorter: true,
            valueEnum: {
                'default': {text: t('identity.role.types.default')},
                'new': {text: t('identity.role.types.new')},
            },
        },
        {
            title: t('general.created_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            hideInSearch: true,
            width: 191,
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            width: 160,
            render: (text, record, _, action) => [
                <NButton key="info">
                    <Link key="get" to={`/role/${record['id']}`}>{t('actions.detail')}</Link>
                </NButton>
                ,
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
            ],
        },
    ];

    return (<div>
        <Disabled disabled={license.isFree()}>
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
                        type: params.type,
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
                headerTitle={t('menus.identity.submenus.role')}
                toolBarRender={() => [
                    <Button key="button" type="primary" onClick={() => {
                        setOpen(true)
                    }}>
                        {t('actions.new')}
                    </Button>
                ]}
            />

            <RoleModal
                id={selectedRowKey}
                open={open}
                confirmLoading={mutation.isPending}
                handleCancel={() => {
                    setOpen(false);
                    setSelectedRowKey(undefined);
                }}
                handleOk={mutation.mutate}
            />
        </Disabled>
    </div>);
}

export default RolePage;
