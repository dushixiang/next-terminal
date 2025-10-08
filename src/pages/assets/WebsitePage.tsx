import React, {useEffect, useRef, useState} from 'react';
import {Button, Popconfirm, Tag} from "antd";
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {useTranslation} from "react-i18next";
import websiteApi, {Website} from "@/src/api/website-api";
import NButton from "@/src/components/NButton";
import NLink from "@/src/components/NLink";
import clsx from "clsx";
import {getImgColor} from "@/src/helper/asset-helper";
import {useNavigate, useSearchParams} from "react-router-dom";
import WebsiteDrawer from "@/src/pages/assets/WebsiteDrawer";
import WebsiteGroupDrawer from "@/src/pages/assets/WebsiteGroupDrawer";
import WebsiteTree from "./WebsiteTree";
import {cn} from "@/lib/utils";
import {useMobile} from "@/src/hook/use-mobile";
import {useWindowSize} from "react-use";
import {getSort} from "@/src/utils/sort";
import {PanelLeftCloseIcon, PanelLeftOpenIcon} from "lucide-react";

const api = websiteApi;

const WebsitePage = () => {

    const {isMobile} = useMobile();
    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();
    let [open, setOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();
    let [searchParams, setSearchParams] = useSearchParams();
    let [groupId, setGroupId] = useState(searchParams.get('groupId') || '');
    const [groupDrawerOpen, setGroupDrawerOpen] = useState<boolean>(false);
    const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('');
    const [isTreeCollapsed, setIsTreeCollapsed] = useState<boolean>(false);
    let {width} = useWindowSize();

    let navigate = useNavigate();
    const containerRef = useRef(null);

    useEffect(() => {
        setSearchParams({
            groupId: groupId,
        })
        actionRef.current?.setPageInfo({
            pageSize: 10,
            current: 1,
        });
        actionRef.current?.reload();

    }, [groupId]);

    const columns: ProColumns<Website>[] = [
        {
            title: t('assets.logo'),
            dataIndex: 'logo',
            hideInSearch: true,
            width: isMobile ? 40 : 60,
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
            width: 120,
            render: (text, record) => {
                return <NLink to={`/website/${record['id']}`}>{text}</NLink>;
            },
        },
        {
            title: t('assets.group'),
            dataIndex: 'groupFullName',
            key: 'groupFullName',
            width: isMobile ? 80 : 150,
            render: (text, record) => {
                return <div className={cn(
                    'cursor-pointer hover:text-blue-500 underline',
                    isMobile && 'text-xs line-clamp-2'
                )}
                            onClick={() => {
                                setSelectedWebsiteId(record.id);
                                setGroupDrawerOpen(true);
                            }}
                >
                    {text || t('assets.default_group')}
                </div>
            },
            hideInSearch: true,
        },
        {
            title: t('general.enabled'),
            dataIndex: 'enabled',
            hideInSearch: true,
            width: 50,
            hideInTable: isMobile, // 移动端隐藏启用状态列
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
            width: isMobile ? 150 : 300,
            render: (text, record) => {
                return <div>
                    <Tag bordered={false} color={'blue'} className={cn(isMobile && 'text-xs')}>
                        {isMobile ?
                            <div className="line-clamp-2">{record.domain}</div> :
                            record.domain + ' -> ' + record.targetUrl
                        }
                    </Tag>
                </div>
            }
        },
        {
            title: t('general.created_at'),
            key: 'createdAt',
            dataIndex: 'createdAt',
            hideInSearch: true,
            hideInTable: isMobile, // 移动端隐藏创建时间列
            width: 160,
            valueType: 'dateTime'
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            width: 120,
            render: (text, record, _, action) => [
                <NButton
                    key="access"
                    onClick={() => {
                        let url = `/browser?websiteId=${record.id}&t=${new Date().getTime()}`
                        window.open(url, '_blank');
                    }}
                >
                    {isMobile ? t('assets.access').substring(0, 2) : t('assets.access')}
                </NButton>,
                <NButton
                    key="edit"
                    onClick={() => {
                        setOpen(true);
                        setSelectedRowKey(record['id']);
                    }}
                >
                    {isMobile ? t('actions.edit').substring(0, 2) : t('actions.edit')}
                </NButton>,
                <Popconfirm
                    key={'delete-confirm'}
                    title={t('general.delete_confirm')}
                    onConfirm={async () => {
                        await api.deleteById(record.id);
                        actionRef.current?.reload();
                    }}
                >
                    <NButton key='delete' danger={true}>
                        {isMobile ? t('actions.delete').substring(0, 2) : t('actions.delete')}
                    </NButton>
                </Popconfirm>,
            ],
        },
    ];

    // 统一的 ProTable 配置
    const tableProps = {
        className: 'border rounded-lg',
        columns,
        actionRef,
        request: async (params: any = {}, sort: any, filter: any) => {
            let [sortOrder, sortField] = getSort(sort);
            
            let queryParams = {
                pageIndex: params.current,
                pageSize: params.pageSize,
                sortOrder: sortOrder,
                sortField: sortField,
                name: params.name,
                groupId: groupId || undefined,
            }
            let result = await api.getPaging(queryParams);
            return {
                data: result['items'],
                success: true,
                total: result['total']
            };
        },
        rowKey: "id" as const,
        search: {
            labelWidth: 'auto' as const,
        },
        pagination: {
            defaultPageSize: 10,
            showSizeChanger: !isMobile // 移动端隐藏页面大小选择器
        },
        dateFormatter: "string" as const,
        headerTitle: t('menus.resource.submenus.website'),
        toolBarRender: () => [
            <Button
                key="auth"
                onClick={() => {
                    navigate('/authorised-website');
                }}
                color={'purple'}
                variant={'dashed'}
            >
                {t('authorised.label.authorised')}
            </Button>,
            <Button key="button" type="primary" onClick={() => {
                setOpen(true)
            }}>
                {t('actions.new')}
            </Button>
        ]
    };

    return (<div>
        <div className={cn('px-4', isMobile && 'px-2')} ref={containerRef}>
            {/* 移动端网站树 - 在表格上方显示 */}
            {isMobile && (
                <>
                    <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg">
                        <WebsiteTree
                            selected={groupId}
                            onSelect={setGroupId}
                        />
                    </div>
                    <ProTable {...tableProps}/>
                </>
            )}

            {/* 桌面端使用 Grid 布局 */}
            {!isMobile && (
                <div className={cn(
                    "grid gap-4 transition-all duration-300",
                    isTreeCollapsed ? "grid-cols-[48px_1fr]" : "grid-cols-[240px_1fr]"
                )}>
                    <div className="relative">
                        {!isTreeCollapsed && (
                            <WebsiteTree
                                selected={groupId}
                                onSelect={setGroupId}
                            />
                        )}
                        
                        <div 
                            className={cn(
                                'absolute top-4 bg-gray-100 p-1.5 rounded dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                                isTreeCollapsed ? 'left-2' : 'right-4'
                            )}
                            onClick={() => setIsTreeCollapsed(!isTreeCollapsed)}
                        >
                            {isTreeCollapsed ? (
                                <PanelLeftOpenIcon className={'w-4 h-4'} />
                            ) : (
                                <PanelLeftCloseIcon className={'w-4 h-4'} />
                            )}
                        </div>
                    </div>
                    <div className="overflow-hidden">
                        <ProTable {...tableProps}
                                  scroll={{
                                      x: 'max-content'
                                  }}
                        />
                    </div>
                </div>
            )}

        </div>

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

        <WebsiteGroupDrawer
            open={groupDrawerOpen}
            onClose={() => {
                setGroupDrawerOpen(false);
                setSelectedWebsiteId('');
            }}
            websiteIds={[selectedWebsiteId]}
            onSuccess={() => {
                actionRef.current?.reload();
            }}
        />
    </div>);
};

export default WebsitePage;