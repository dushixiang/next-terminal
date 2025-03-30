import React, {useEffect, useRef, useState} from 'react';

import {App, Badge, Button, Popover, Select, Space, Table, Tag, Tooltip, Upload} from "antd";
import {Link, useNavigate, useSearchParams} from "react-router-dom";
import {ActionType, ProColumns, ProTable, TableDropdown} from "@ant-design/pro-components";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import assetsApi, {Asset} from '@/src/api/asset-api';
import NButton from "@/src/components/NButton";
import NLink from "@/src/components/NLink";
import AssetTree from "@/src/pages/assets/AssetTree";
import {accessAsset} from "@/src/helper/access-tab-channel";
import {maybe} from "@/src/utils/maybe";
import clsx from "clsx";
import {getImgColor, getProtocolColor} from "@/src/helper/asset-helper";
import AssetTreeChoose from "@/src/pages/assets/AssetTreeChoose";
import {openOrSwitchToPage} from "@/src/utils/utils";
import {ResizablePanel, ResizablePanelGroup} from "@/components/ui/resizable";
import {cn} from "@/lib/utils";
import {ImperativePanelHandle} from "react-resizable-panels";
import {useWindowSize} from "react-use";
import {ArrowLeftToLineIcon, ArrowRightToLineIcon} from "lucide-react";
import {safeEncode} from "@/src/utils/codec";

const api = assetsApi;

function downloadImportExampleCsv() {
    let csvString = 'name,ssh,127.0.0.1,22,username,password,privateKey,passphrase,description,tag1|tag2|tag3';
    //前置的"\uFEFF"为“零宽不换行空格”，可处理中文乱码问题
    const blob = new Blob(["\uFEFF" + csvString], {type: 'text/csv;charset=gb2312;'});
    let a = document.createElement('a');
    a.download = 'sample.csv';
    a.href = URL.createObjectURL(blob);
    a.click();
}

const AssetPage = () => {

    const actionRef = useRef<ActionType>();
    let [searchParams, setSearchParams] = useSearchParams();

    let [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    let [groupId, setGroupId] = useState(maybe(searchParams.get('groupId'), ''));

    let [open, setOpen] = useState(false);

    let navigate = useNavigate();
    let {t} = useTranslation();
    let {modal} = App.useApp();

    const [isCollapsed, setIsCollapsed] = React.useState(false);
    let leftRef = useRef<ImperativePanelHandle>();
    let {height} = useWindowSize();

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

    let tagsQuery = useQuery({
        queryKey: ['tags'],
        queryFn: assetsApi.getTags,
        refetchOnWindowFocus: false,
    });

    let testingMutation = useMutation({
        mutationFn: assetsApi.checking,
        onSuccess: () => {
            actionRef.current?.reload();
        }
    });

    const importExampleContent = <>
        <NButton onClick={downloadImportExampleCsv}>{t('assets.download_sample')}</NButton>
        <div>{t('assets.import_asset_tip')}</div>
    </>

    const columns: ProColumns<Asset>[] = [
        {
            title: t('assets.logo'),
            dataIndex: 'logo',
            hideInSearch: true,
            render: (text, record) => {
                if (record.logo === '') {
                    return <div
                        className={clsx(`w-6 h-6 rounded flex items-center justify-center font-bold text-white text-xs`, getImgColor(record.protocol))}>
                        {record.name[0]}
                    </div>
                }
                return <img src={record.logo} alt={record['name']} className={'w-6 h-6'}/>;
            }
        },
        {
            title: t('assets.name'),
            dataIndex: 'name',
            sorter: true,
            width: 200,
            render: (text, record) => {
                if (record['description'] === '-') {
                    record['description'] = '';
                }

                let view = <NLink to={`/asset/${record['id']}`}>{text}</NLink>;
                return <div className={'flex flex-col'}>
                    {view}
                    <div className={'text-gray-500 line-clamp-1'}>{record['description']}</div>
                </div>
            },
        },
        {
            title: t('assets.group'),
            dataIndex: 'groupFullName',
            key: 'groupFullName',
            render: (text, record) => {
                return <div className={'cursor-pointer hover:text-blue-500 underline'}
                            onClick={() => {
                                setOpen(true);
                                setSelectedRowKeys([record.id]);
                            }}
                >
                    {text}
                </div>
            },
        },
        {
            title: t('assets.protocol'),
            dataIndex: 'protocol',
            key: 'protocol',
            sorter: true,
            render: (text, record) => {
                return <span
                    className={clsx('rounded-md px-1.5 py-1 text-white font-bold', getProtocolColor(record.protocol))}
                    style={{fontSize: 9,}}>
                        {record.protocol.toUpperCase()}
                    </span>
            },
            renderFormItem: (item, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }

                return (
                    <Select>
                        <Select.Option value="rdp">RDP</Select.Option>
                        <Select.Option value="ssh">SSH</Select.Option>
                        <Select.Option value="telnet">Telnet</Select.Option>
                        <Select.Option value="vnc">VNC</Select.Option>
                        <Select.Option value="kubernetes">Kubernetes</Select.Option>
                    </Select>
                );
            },
        },
        {
            title: t('assets.network'),
            dataIndex: 'network',
            key: 'network',
            // sorter: true,
            render: (text, record) => {
                return `${record['ip'] + ':' + record['port']}`;
            }
        },
        {
            title: t('assets.tags'),
            dataIndex: 'tags',
            key: 'tags',
            render: tags => {
                if (tags == '-') {
                    return undefined;
                }
                if (tags) {
                    let items = tags as string[];
                    return items?.map(tag => <Tag key={tag}>{tag}</Tag>);
                }
            },
            renderFormItem: (item, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }

                return (
                    <Select mode="multiple"
                            allowClear>
                        {
                            tagsQuery.data?.map(tag => {
                                if (tag === '-') {
                                    return undefined;
                                }
                                return <Select.Option key={tag}>{tag}</Select.Option>
                            })
                        }
                    </Select>
                );
            },
        },
        {
            title: t('assets.status'),
            dataIndex: 'status',
            key: 'status',
            sorter: true,
            render: (status, record) => {
                switch (status) {
                    case 'testing':
                        return (
                            <Badge status="processing" text={t('assets.testing')}/>
                        )
                    case 'active':
                        return (
                            <Badge status="success" text={t('assets.active')}/>
                        )
                    case 'inactive':
                        return (
                            <Tooltip title={record.statusText}>
                                <Badge status="error" text={t('assets.inactive')}/>
                            </Tooltip>
                        )
                }
            },
            renderFormItem: (item, {type, defaultRender, ...rest}, form) => {
                if (type === 'form') {
                    return null;
                }

                return (
                    <Select>
                        <Select.Option value="active">{t('assets.active')}</Select.Option>
                        <Select.Option value="inactive">{t('assets.inactive')}</Select.Option>
                    </Select>
                );
            },
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            width: 100,
            render: (text, record, index, action) => {
                const id = record['id'];
                return [
                    <NButton
                        key={`btn-access-${id}`}
                        onClick={() => {
                            let msg = {
                                id: id,
                                name: record['name'],
                                protocol: record['protocol'],
                            }
                            const url = `/access?asset=${safeEncode(msg)}`;
                            openOrSwitchToPage(url, 'NT_Access');
                            accessAsset(msg);
                        }}
                    >
                        {t('assets.access')}
                    </NButton>,
                    <TableDropdown
                        key={`perm-action-${id}`}
                        onSelect={(key) => {
                            switch (key) {
                                case "copy":
                                    navigate(`/asset/post?assetsId=${record.id}&copy=true`);
                                    break;
                                case "edit":
                                    navigate(`/asset/post?assetsId=${record.id}`);
                                    break;
                                case 'asset-detail':
                                    navigate(`/asset/${record['id']}?activeKey=info`);
                                    break;
                                case 'bind-user':
                                    navigate(`/asset/${record['id']}?activeKey=bind-user`);
                                    break;
                                case 'bind-user-group':
                                    navigate(`/asset/${record['id']}?activeKey=bind-user-group`);
                                    break;
                                case "up":
                                    api.up(record.id).then(() => {
                                        actionRef.current?.reload();
                                    })
                                    break;
                                case "down":
                                    api.down(record.id).then(() => {
                                        actionRef.current?.reload();
                                    })
                                    break;
                                case 'delete':
                                    modal.confirm({
                                        title: t('general.delete_confirm'),
                                        okText: t('actions.delete'),
                                        onOk: async () => {
                                            await api.deleteById(record.id);
                                            actionRef.current?.reload();
                                        },
                                    })
                            }
                        }}
                        menus={[
                            {key: 'copy', name: t('assets.copy')},
                            {key: 'edit', name: t('actions.edit')},
                            {key: 'asset-detail', name: t('actions.detail')},
                            {key: 'bind-user', name: t('assets.bind_user')},
                            {key: 'bind-user-group', name: t('assets.bind_user_group')},
                            {key: 'up', name: t('assets.up')},
                            {key: 'down', name: t('assets.down')},
                            {key: 'delete', name: t('actions.delete'), danger: true},
                        ]}
                    />,
                ]
            },
        },
    ];

    const handleImportAsset = async (file: any) => {
        let data = await api.importAsset(file);
        let error = data['error'];
        let errorAssets = data['errorAssets'];
        if (error === '') {
            modal.success({
                title: t('assets.import_asset_success'),
                content: t('general.success')
            })
        } else {
            modal.error({
                title: t('assets.import_asset_error'),
                content: <div>
                    <p>{t('assets.import_asset_error_title')}</p>
                    <ul>
                        {
                            errorAssets.map((item: any) => {
                                return <li>{item['name']}：{item['error']}</li>
                            })
                        }
                    </ul>
                </div>

            })
        }
        actionRef.current?.reload();
        return false;
    }

    return (<div>
        <div className={'px-4'}>
            <ResizablePanelGroup direction="horizontal"
                                 className={cn(
                                     !isCollapsed && 'gap-3'
                                 )}
            >
                <ResizablePanel
                    defaultSize={15}
                    style={{
                        maxHeight: height - 40,
                    }}
                    collapsible={true}
                    collapsedSize={2}
                    onResize={(size) => {
                        if (size === 2) {
                            setIsCollapsed(true);
                        } else {
                            setIsCollapsed(false);
                        }
                    }}
                    className={cn(
                        "transition-all duration-300 ease-in-out",
                        isCollapsed && "min-w-[48px]",
                        !isCollapsed && "min-w-[240px]",
                    )}
                    ref={leftRef}
                >
                    <div className={'relative'}>
                        {!isCollapsed &&
                            <AssetTree
                                selected={groupId}
                                onSelect={setGroupId}
                            />
                        }

                        <div className={cn(
                            'absolute right-4 top-4',
                            'bg-gray-100 p-1.5 rounded dark:bg-gray-800'
                        )}
                             onClick={() => {
                                 if (leftRef.current?.isCollapsed()) {
                                     leftRef.current?.expand();
                                 } else {
                                     leftRef.current?.collapse();
                                 }
                             }}
                        >
                            {isCollapsed && <ArrowRightToLineIcon className={'w-4 h-4 cursor-pointer'}/>}
                            {!isCollapsed && <ArrowLeftToLineIcon className={'w-4 h-4 cursor-pointer'}/>}
                        </div>
                    </div>

                </ResizablePanel>
                <ResizablePanel defaultSize={85}
                                onResize={(size) => {
                                    console.log('resize content', size)
                                }}
                >
                    <ProTable
                        className={'flex-grow border rounded-lg'}
                        columns={columns}
                        actionRef={actionRef}
                        request={async (params = {}, sort, filter) => {
                            let ip: string, port: string;
                            if (params.network) {
                                let split = params.network.split(':');
                                if (split.length >= 2) {
                                    ip = split[0];
                                    port = split[1];
                                } else {
                                    ip = split[0];
                                }
                            }

                            let queryParams = {
                                pageIndex: params.current,
                                pageSize: params.pageSize,
                                sort: JSON.stringify(sort),
                                name: params.name,
                                type: params.type,
                                protocol: params.protocol,
                                active: params.active,
                                tags: params.tags?.join(','),
                                ip: ip,
                                port: port,
                                groupId: groupId,
                                status: params.status,
                            }
                            let result = await api.getPaging(queryParams);
                            return {
                                data: result.items,
                                success: true,
                                total: result['total']
                            };
                        }}
                        columnsState={{
                            persistenceKey: 'assets-table',
                            persistenceType: 'localStorage',
                        }}
                        rowSelection={{
                            selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT],
                        }}
                        tableAlertOptionRender={({selectedRowKeys}) => {
                            return (
                                <Space size={16}>
                                    <NButton
                                        onClick={() => {
                                            setSelectedRowKeys(selectedRowKeys as string[]);
                                            setOpen(true);
                                        }}
                                    >
                                        {t('assets.change_group')}
                                    </NButton>
                                    <NButton
                                        onClick={() => {
                                            testingMutation.mutate(selectedRowKeys as string[]);
                                        }}
                                    >
                                        {t('assets.conn_test')}
                                    </NButton>
                                    <NButton
                                        danger={true}
                                        onClick={async () => {
                                            modal.confirm({
                                                title: t('general.delete_confirm'),
                                                onOk: async () => {
                                                    await api.deleteById(selectedRowKeys.join(','));
                                                    actionRef.current?.reload();
                                                }
                                            })
                                        }}
                                    >{t('actions.delete')}
                                    </NButton>
                                </Space>
                            );
                        }}
                        rowKey="id"
                        // search={{
                        //     labelWidth: 'auto',
                        // }}
                        // search={false}
                        pagination={{
                            defaultPageSize: 10,
                            showSizeChanger: true
                        }}
                        dateFormatter="string"
                        headerTitle={t('menus.resource.submenus.asset')}
                        toolBarRender={() => {
                            return [
                                <Link to={`/asset/post?groupId=${groupId}`}>
                                    <Button key="add" type="primary">
                                        {t('actions.new')}
                                    </Button>
                                </Link>,
                                <Popover content={importExampleContent}>
                                    <Upload
                                        maxCount={1}
                                        beforeUpload={handleImportAsset}
                                        showUploadList={false}
                                    >
                                        <Button key='import'>{t('assets.import')}</Button>
                                    </Upload>
                                </Popover>,
                            ];
                        }}
                    />
                </ResizablePanel>
            </ResizablePanelGroup>


        </div>

        <AssetTreeChoose
            assetIds={selectedRowKeys}
            open={open}
            onClose={() => {
                setOpen(false);
                setSelectedRowKeys([]);
                actionRef.current?.reload();
            }}
        />
    </div>);
}

export default AssetPage;
