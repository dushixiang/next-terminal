import React, {useRef, useState} from 'react';
import {App, Button, Popconfirm, Tag} from "antd";
import {ActionType, ProColumns, ProTable, TableDropdown} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import websiteApi, {Website} from "@/src/api/website-api";
import NButton from "@/src/components/NButton";
import NLink from "@/src/components/NLink";
import clsx from "clsx";
import {getImgColor} from "@/src/helper/asset-helper";
import {useNavigate} from "react-router-dom";
import WebsiteDrawer from "@/src/pages/assets/WebsiteDrawer";

const api = websiteApi;

const WebsitePage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();
    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();

    let navigate = useNavigate();

    const columns: ProColumns<Website>[] = [
        {
            title: t('assets.logo'),
            dataIndex: 'logo',
            hideInSearch: true,
            render: (text, record) => {
                if (record.logo === '') {
                    return <div
                        className={clsx(`w-6 h-6 rounded flex items-center justify-center font-bold text-white text-xs`, getImgColor('http'))}>
                        {record.name[0]}
                    </div>
                }
                return <img src={record.logo} alt={record['name']} className={'w-6 h-6'}/>;
            }
        },
        {
            title: t('assets.name'),
            dataIndex: 'name',
            render: (text, record) => {
                return <NLink to={`/website/${record['id']}`}>{text}</NLink>;
            },
        },
        {
            title: t('general.enabled'),
            dataIndex: 'enabled',
            hideInSearch: true,
            render: (text) => {
                if (text === true) {
                    return <Tag color={'green-inverse'} bordered={false}>{t('general.yes')}</Tag>
                } else {
                    return <Tag color={'gray'} bordered={false}>{t('general.no')}</Tag>
                }
            }
        },
        {
            title: t('assets.domain'),
            dataIndex: 'domain',
            key: 'domain',
            render: (text, record) => {
                return <div>
                    <Tag bordered={false} color={'blue'}>{record.outerUrl + ' -> ' + record.targetUrl}</Tag>
                </div>
            }
        },
        {
            title: t('general.created_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            hideInSearch: true,
            valueType: 'dateTime'
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            width: 200,
            render: (text, record, _, action) => [
                <NButton
                    key="access"
                    onClick={() => {
                        let url = `/browser?websiteId=${record.id}&t=${new Date().getTime()}`
                        window.open(url, '_blank');
                    }}
                >
                    {t('assets.access')}
                </NButton>,
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
                    <NButton key='delete' danger={true}>{t('actions.delete')}</NButton>
                </Popconfirm>,
                <TableDropdown
                    key={`perm-action-${record.id}`}
                    onSelect={(key) => {
                        switch (key) {
                            case 'bind-user':
                                navigate(`/website/${record['id']}?activeKey=bind-user`);
                                break;
                            case 'bind-user-group':
                                navigate(`/website/${record['id']}?activeKey=bind-user-group`);
                                break;
                        }
                    }}
                    menus={[
                        {
                            key: 'bind-user',
                            name: t('assets.bind_user'),
                        },
                        {
                            key: 'bind-user-group',
                            name: t('assets.bind_user_group'),
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
            headerTitle={t('menus.resource.submenus.website')}
            toolBarRender={() => [
                <Button key="button" type="primary" onClick={() => {
                    setOpen(true)
                }}>
                    {t('actions.new')}
                </Button>
            ]}
        />

        <WebsiteDrawer
            id={selectedRowKey}
            open={open}
            onClose={() => {
                setOpen(false);
                setSelectedRowKey(undefined);
            }}
            onSuccess={() => {
                // 刷新列表等操作
                actionRef.current?.reload();
            }}

        />
    </div>);
};

export default WebsitePage;