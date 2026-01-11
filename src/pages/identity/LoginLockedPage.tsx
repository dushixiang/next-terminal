import React, {useRef} from 'react';
import {Popconfirm, Tag} from "antd";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import loginLockedApi, {LoginLocked} from "../../api/login-locked-api";
import {useTranslation} from "react-i18next";
import NButton from "../../components/NButton";
import {getSort} from "@/utils/sort";

const LoginLockedPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>(null);

    const columns: ProColumns<LoginLocked>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: 'IP',
            dataIndex: 'ip',
            key: 'ip',
            sorter: true,
        }, {
            title: t('identity.user.username'),
            dataIndex: 'username',
            key: 'username',
            sorter: true,
        },
        {
            title: t('identity.user.locked_type'),
            dataIndex: 'type',
            key: 'type',
            hideInSearch: true,
            render: (text, record) => {
                switch (record.type) {
                    case 'username':
                        return <Tag bordered={false} color={'purple'}>{t('identity.user.locked_type_username')}</Tag>;
                    case 'ip':
                        return <Tag bordered={false} color={'red'}>{t('identity.user.locked_type_ip')}</Tag>;
                }
            }
        },
        {
            title: t('identity.user.locked_at'),
            dataIndex: 'lockedAt',
            key: 'lockedAt',
            valueType: 'dateTime',
            hideInSearch: true,
            sorter: true,
        },
        {
            title: t('identity.user.expiration_at'),
            dataIndex: 'expirationAt',
            key: 'expirationAt',
            valueType: 'dateTime',
            hideInSearch: true,
            sorter: true,
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            render: (text, record, _, action) => [
                <Popconfirm
                    key={'delete-confirm'}
                    title={t('general.delete_confirm')}
                    onConfirm={async () => {
                        await loginLockedApi.deleteById(record.id);
                        actionRef.current?.reload();
                    }}
                >
                    <NButton key='delete' danger={true}>{t('actions.delete')}</NButton>
                </Popconfirm>
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
                        ip: params.ip,
                        username: params.username,
                    }
                    let result = await loginLockedApi.getPaging(queryParams);
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
                headerTitle={t('menus.identity.submenus.login_locked')}
                toolBarRender={() => []}
            />
        </div>
    );
};

export default LoginLockedPage;