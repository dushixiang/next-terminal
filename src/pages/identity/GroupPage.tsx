import React, {useRef, useState} from 'react';

import {Button, message, Popconfirm} from "antd";
import {ActionType, ProColumns, ProTable, TableDropdown} from "@ant-design/pro-components";
import GroupModal from "./GroupModal";
import {useNavigate} from "react-router-dom";
import userGroupApi, {UserGroup} from '@/src/api/user-group-api';
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import NLink from "@/src/components/NLink";
import NButton from "@/src/components/NButton";

const api = userGroupApi;

const GroupPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();

    let navigate = useNavigate();

    const [messageApi, contextHolder] = message.useMessage();

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
        messageApi.open({
            type: 'success',
            content: t('general.success'),
        });
    }

    const columns: ProColumns<UserGroup>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: t('general.name'),
            dataIndex: 'name',
            render: (text, record) => {
                return <NLink to={`/user-group/${record.id}`}>{text}</NLink>;
            },
        },
        {
            title: t('identity.user_group.members_count'),
            dataIndex: 'members',
            hideInSearch: true,
            render: (text, record) => {
                return record['members']?.length ?? 0;
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
                <TableDropdown
                    key="actionGroup"
                    onSelect={(key) => {
                        switch (key) {
                            case 'user-group-detail':
                                navigate(`/user-group/${record['id']}?activeKey=info`);
                                break;
                            case 'user-group-authorised-asset':
                                navigate(`/user-group/${record['id']}?activeKey=asset`);
                                break;
                        }
                    }}
                    menus={[
                        {key: 'user-group-detail', name: t('actions.detail')},
                        {
                            key: 'user-group-authorised-asset',
                            name: t('identity.options.authorized_asset'),
                        },
                    ]}
                />,
            ],
        },
    ];

    return (<div>
        <ProTable
            columns={columns}
            actionRef={actionRef}
            request={async (params = {}, sort, filter) => {
                let queryParams = {
                    pageIndex: params.current,
                    pageSize: params.pageSize,
                    sort: JSON.stringify(sort),
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
            headerTitle={t('menus.identity.submenus.user_group')}
            toolBarRender={() => [
                <Button key="button" type="primary" onClick={() => {
                    setOpen(true)
                }}>
                    {t('actions.new')}
                </Button>
            ]}
        />

        <GroupModal
            id={selectedRowKey}
            open={open}
            confirmLoading={mutation.isPending}
            handleCancel={() => {
                setOpen(false);
                setSelectedRowKey(undefined);
            }}
            handleOk={mutation.mutate}
        />
        {contextHolder}
    </div>);
}

export default GroupPage;
