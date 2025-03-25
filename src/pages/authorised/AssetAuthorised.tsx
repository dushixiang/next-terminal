import React, {useEffect, useRef, useState} from 'react';
import {useTranslation} from "react-i18next";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {App, Button} from "antd";
import {useMutation} from "@tanstack/react-query";
import authorisedAssetApi, {Authorised} from "@/src/api/authorised-asset-api";
import AssetAuthorisedModal from "@/src/pages/authorised/AssetAuthorisedModal";
import NButton from "@/src/components/NButton";
import NLink from "@/src/components/NLink";
import strings from "@/src/utils/strings";
import dayjs from "dayjs";
import {cn} from "@/lib/utils";

interface Props {
    active: boolean
    assetId: string
    view: 'User' | 'UserGroup'
}

const AssetAuthorised = ({active, assetId, view}: Props) => {
    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    const {message} = App.useApp();

    useEffect(() => {
        if (active) {
            actionRef.current?.reload();
        }
    }, [active]);

    useEffect(() => {
        if (!open) {
            setSelectedRowKey('');
        }
    }, [open]);

    let mutation = useMutation({
        mutationFn: (data) => {
            if (strings.hasText(data['id'])) {
                return authorisedAssetApi.update(data['id'], data);
            }
            switch (view) {
                case "User":
                    return authorisedAssetApi.authorisedUsers(data);
                case "UserGroup":
                    return authorisedAssetApi.authorisedUserGroups(data);
            }
        },
        onSuccess: () => {
            setOpen(false);
            setSelectedRowKey(undefined);
            actionRef.current?.reload();
        }
    });

    function showSuccess() {
        message.open({
            type: 'success',
            content: t('general.success'),
        });
    }

    const renderView = () => {
        switch (view) {
            case "User":
                return {
                    title: t('authorised.label.user'),
                    dataIndex: 'userName',
                    render: ((text: any, record: any) => {
                        if (text === '-') {
                            return '-';
                        }
                        return <NLink to={`/user/${record.userId}`}>{text}</NLink>
                    })
                }
            case "UserGroup":
                return {
                    title: t('authorised.label.user_group'),
                    dataIndex: 'userGroupName',
                    render: ((text: any, record: any) => {
                        if (text === '-') {
                            return '-';
                        }
                        return <NLink to={`/user-group/${record.userGroupId}`}>{text}</NLink>
                    })
                }
        }
    }

    const columns: ProColumns<Authorised>[] = [
        {
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        renderView(),
        {
            title: t('authorised.label.command_filter'),
            dataIndex: 'commandFilterName',
            hideInSearch: true,
            render: ((text, record) => {
                if (text === '-') {
                    return '-';
                }
                return <NLink to={`/command-filter/${record.commandFilterId}`}>{text}</NLink>
            })
        },
        {
            title: t('authorised.label.strategy'),
            dataIndex: 'strategyName',
            hideInSearch: true,
            render: ((text, record) => {
                if (text === '-') {
                    return '-';
                }
                return <NLink to={`/strategy/${record.strategyId}`}>{text}</NLink>
            })
        },
        {
            title: t('authorised.label.expired_at'),
            key: 'expiredAt',
            dataIndex: 'expiredAt',
            hideInSearch: true,
            render: (text, record) => {
                if (record.expiredAt === 0) {
                    return '-';
                }
                let expiredAt = dayjs(record.expiredAt);
                const now = dayjs();
                const daysDifference = expiredAt.diff(now, 'day'); // 计算相差天数

                // 根据天数差异设置不同的类名
                let statusClass = '';
                if (daysDifference > 7) {
                    statusClass = 'text-green-500';  // 超过 7 天 - 绿色
                } else if (daysDifference > 0) {
                    statusClass = 'text-yellow-500';  // 小于 7 天但大于 0 天 - 黄色
                } else {
                    statusClass = 'text-red-500';  // 小于当前时间 - 红色
                }
                return <div className={cn(
                    statusClass
                )}>
                    {expiredAt.format('YYYY-MM-DD HH:mm:ss')} ({expiredAt.fromNow().replaceAll('内', '后')})
                </div>;
            }
        },
        {
            title: t('authorised.label.authorised_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            valueType: 'dateTime',
            hideInSearch: true,
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            width: 50,
            render: (text, record, _, action) => [
                <NButton
                    key="edit"
                    onClick={async () => {
                        setSelectedRowKey(record.id);
                        setOpen(true);
                    }}
                >
                    {t('actions.edit')}
                </NButton>,
                <NButton
                    key="unbind"
                    danger
                    onClick={async () => {
                        await authorisedAssetApi.deleteById(record['id']);
                        actionRef.current?.reload();
                    }}
                >
                    {t('actions.unbind')}
                </NButton>
                ,
            ],
        },
    ];

    return (
        <div>
            <ProTable
                columns={columns}
                actionRef={actionRef}
                request={async (params = {}, sort, filter) => {

                    let queryParams = {
                        pageIndex: params.current,
                        pageSize: params.pageSize,
                        sort: JSON.stringify(sort),
                        assetId: assetId,
                        view: view,
                    }
                    let result = await authorisedAssetApi.paging(queryParams);
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
                headerTitle={t('authorised.label.authorised')}
                toolBarRender={() => [
                    <Button key="button" type="primary" onClick={() => {
                        setOpen(true);
                    }}>
                        {t('actions.authorized')}
                    </Button>
                ]}
            />

            <AssetAuthorisedModal
                view={view}
                assetId={assetId}
                open={open}
                confirmLoading={mutation.isPending}
                handleCancel={() => {
                    setOpen(false);
                }}
                handleOk={mutation.mutate}
                id={selectedRowKey}
            />
        </div>
    );
};

export default AssetAuthorised;