import React, {useState, useRef} from 'react';
import {ProColumns, DragSortTable, ActionType} from "@ant-design/pro-components";
import {App, Button, Popconfirm, Progress} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import agentGatewayApi, {AgentGateway, SortItem} from "@/src/api/agent-gateway-api";
import AgentGatewayModal from "@/src/pages/gateway/AgentGatewayModal";
import AgentGatewayRegister from "@/src/pages/gateway/AgentGatewayRegister";
import NButton from "@/src/components/NButton";
import {useLicense} from "@/src/hook/use-license";
import Disabled from "@/src/components/Disabled";
import AgentGatewayTokenDrawer from "@/src/pages/gateway/AgentGatewayTokenDrawer";
import {ArrowDownIcon, ArrowUpIcon, HardDriveDownloadIcon, HardDriveUploadIcon} from "lucide-react";
import {formatUptimeEn, getColor, renderSize} from "@/src/utils/utils";
import AgentGatewayStat from "@/src/pages/gateway/AgentGatewayStat";

const api = agentGatewayApi;

const linuxImg = new URL('@/src/assets/images/linux.png', import.meta.url).href;
const windowsImg = new URL('@/src/assets/images/windows.png', import.meta.url).href;
const macosImg = new URL('@/src/assets/images/macos.png', import.meta.url).href;

const AgentGatewayPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>();

    let [open, setOpen] = useState<boolean>(false);
    let [registerOpen, setRegisterOpen] = useState<boolean>(false);
    let [selectedRowKey, setSelectedRowKey] = useState<string>();
    let [license] = useLicense();
    let [dataSource, setDataSource] = useState<AgentGateway[]>([]);

    let [tokenManageOpen, setTokenManageOpen] = useState<boolean>(false);
    let [statOpen, setStatOpen] = useState<boolean>(false);

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
            // 重新获取数据
            actionRef.current?.reload();
            setOpen(false);
            setSelectedRowKey(undefined);
            showSuccess();
        }
    });

    const updateSortMutation = useMutation({
        mutationFn: (items: SortItem[]) => api.updateSort(items),
        onSuccess: () => {
            // 不立即重新加载，让 polling 自然更新数据
            message.success(t('gateways.sort_success'));
        }
    });

    function showSuccess() {
        message.open({
            type: 'success',
            content: t('general.success'),
        });
    }

    const handleDragSortEnd = (beforeIndex: number, afterIndex: number, newDataSource: AgentGateway[]) => {
        console.log('排序后的数据', newDataSource);
        
        // 立即更新本地状态，避免闪烁
        setDataSource(newDataSource);
        
        // 更新排序 - 后端使用倒序排列，越大的在前面
        const sortItems: SortItem[] = newDataSource.map((item, index) => ({
            id: item.id,
            sortOrder: newDataSource.length - index  // 倒序：第一个位置的sortOrder最大
        }));

        // 服务器更新
        updateSortMutation.mutate(sortItems);
    };

    const JudgeLoadBusy = (load: number, cores: number) => {
        const ratio = load / cores;

        if (ratio < 0.7) return <div className={'text-green-400'}>{t('gateways.load.normal')}</div>;      // 系统空闲
        if (ratio < 1.0) return <div className={'text-orange-400'}>{t('gateways.load.moderate')}</div>;     // 轻度繁忙
        return <div className={'text-red-400'}>{t('gateways.load.busy')}</div>;                         // 资源紧张
    }

    let columns: ProColumns<AgentGateway>[] = [
        {
            title: t('gateways.sort'),
            dataIndex: 'sortOrder',
            width: 60,
            className: 'drag-visible',
            hideInSearch: true,
        },
        {
            title: t('gateways.name'),
            dataIndex: 'name',
            className: 'drag-visible',
            render: (text, record) => {
                let osImg = '';
                switch (record.os) {
                    case 'linux':
                        osImg = linuxImg;
                        break;
                    case 'windows':
                        osImg = windowsImg;
                        break;
                    case 'darwin':
                        osImg = macosImg;
                        break;
                }
                if (record.online) {
                    return <div className={'flex items-center gap-1'}>
                        <img src={osImg} className={'w-4 h-4 mr-1'} alt={'os'}/>
                        <span>{record.name}</span>
                    </div>
                }
                return <div className={'flex items-center gap-1'}>
                    <img src={osImg} className={'w-4 h-4 mr-1'} alt={'os'}/>
                    <span>{record.name}</span>
                </div>
            }
        },
        {
            title: t('gateways.stat.uptime'),
            dataIndex: 'stat.cpu',
            key: 'stat.cpu',
            hideInSearch: true,
            render: (text, record) => {
                return <div>
                    {formatUptimeEn(record.stat?.host.uptime)}
                </div>
            }
        },
        {
            title: t('gateways.stat.load'),
            dataIndex: 'stat.load',
            key: 'stat.load',
            hideInSearch: true,
            render: (text, record) => {
                if (record.online === false) {
                    return '-';
                }
                return <div>
                    {JudgeLoadBusy(record.stat?.load.load_1, record.stat?.cpu.logical_cores)}
                </div>
            }
        },
        {
            title: t('gateways.stat.cpu'),
            dataIndex: 'stat.cpu',
            key: 'stat.cpu',
            hideInSearch: true,
            width: 120,
            render: (text, record) => {
                return <div className={'text-xs'}>
                    <Progress size="small"
                              style={{
                                  width: '100px',
                              }}
                              strokeColor={getColor(record.stat?.cpu.percent)}
                              percent={record.stat?.cpu.percent}
                              format={(percent, successPercent) => `${percent.toFixed(2)}%`}
                    />
                </div>
            }
        },
        {
            title: t('gateways.stat.memory'),
            dataIndex: 'stat.memory',
            key: 'stat.memory',
            hideInSearch: true,
            width: 120,
            render: (text, record) => {
                return <div className={'text-xs'}>
                    <Progress size="small"
                              style={{
                                  width: '100px',
                              }}
                              strokeColor={getColor(record.stat?.memory.percent)}
                              percent={record.stat?.memory.percent}
                              format={(percent, successPercent) => `${percent.toFixed(2)}%`}
                    />
                </div>
            }
        },
        {
            title: t('gateways.stat.disk'),
            dataIndex: 'stat.disk',
            key: 'stat.disk',
            hideInSearch: true,
            width: 120,
            render: (text, record) => {
                return <div className={'text-xs'}>
                    <Progress size="small"
                              style={{
                                  width: '100px',
                              }}
                              strokeColor={getColor(record.stat?.disk.percent)}
                              percent={record.stat?.disk.percent}
                              format={(percent, successPercent) => `${percent.toFixed(2)}%`}
                    />
                </div>
            }
        },
        {
            title: t('gateways.stat.network_io'),
            dataIndex: 'stat.network_io',
            key: 'stat.network_io',
            hideInSearch: true,
            width: 120,
            render: (text, record) => {
                return <div className="flex flex-col gap-1 text-xs">
                    <div className={'flex items-center gap-1 text-green-500'}>
                        <ArrowUpIcon className={'h-4 w-4 '}/>
                        <div>{renderSize(record.stat?.network.rx_sec)}/s</div>
                    </div>
                    <div className={'flex items-center gap-1 text-red-500'}>
                        <ArrowDownIcon className={'h-4 w-4 '}/>
                        <div>{renderSize(record.stat?.network.tx_sec)}/s</div>
                    </div>
                </div>
            }
        },
        {
            title: t('gateways.stat.disk_io'),
            dataIndex: 'stat.disk_io',
            key: 'stat.disk_io',
            hideInSearch: true,
            width: 120,
            render: (text, record) => {
                return <div className="flex flex-col gap-1 text-xs">
                    <div className={'flex items-center gap-1 text-green-500'}>
                        <HardDriveUploadIcon className={'h-4 w-4 '}/>
                        <div>{renderSize(record.stat?.disk_io.read_bytes)}/s</div>
                    </div>
                    <div className={'flex items-center gap-1 text-red-500'}>
                        <HardDriveDownloadIcon className={'h-4 w-4 '}/>
                        <div>{renderSize(record.stat?.disk_io.write_bytes)}/s</div>
                    </div>
                </div>
            }
        },
        {
            title: t('gateways.version'),
            key: 'version',
            dataIndex: 'version',
            hideInSearch: true,
        },
        {
            title: t('gateways.stat.ping'),
            key: 'ping',
            dataIndex: 'ping',
            hideInSearch: true,
            render: (text, record) => {
                return <div>
                    {record.stat?.ping} ms
                </div>
            }
        },
        {
            title: t('general.updated_at'),
            key: 'updatedAt',
            dataIndex: 'updatedAt',
            hideInSearch: true,
            valueType: 'fromNow'
        },
        {
            title: t('actions.option'),
            valueType: 'option',
            key: 'option',
            width: 120,
            render: (text, record, _, action) => [
                <NButton
                    key="edit"
                    onClick={() => {
                        setStatOpen(true);
                        setSelectedRowKey(record.id);
                    }}
                >
                    {t('gateways.stat.label')}
                </NButton>,
                <NButton
                    key="edit"
                    onClick={() => {
                        setOpen(true);
                        setSelectedRowKey(record.id);
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
            ],
        },
    ];

    return (
        <div>
            <Disabled disabled={license.isFree()}>
                <DragSortTable
                    headerTitle={t('menus.gateway.submenus.agent_gateway')}
                    columns={columns}
                    actionRef={actionRef}
                    rowKey="id"
                    search={{
                        labelWidth: 'auto',
                    }}
                    pagination={{
                        defaultPageSize: 10,
                        showSizeChanger: true
                    }}
                    request={async (params = {}, sort, filter) => {
                        let queryParams = {
                            pageIndex: params.current,
                            pageSize: params.pageSize,
                            sort: JSON.stringify(sort),
                            name: params.name,
                        }
                        let result = await api.getPaging(queryParams);
                        // 直接使用后端返回的数据，包含 sortOrder 字段
                        setDataSource(result['items']);
                        return {
                            data: result['items'],
                            success: true,
                            total: result['total']
                        };
                    }}
                    dataSource={dataSource}
                    dragSortKey="sortOrder"
                    onDragSortEnd={handleDragSortEnd}
                    rowClassName={(record) => {
                        if (record.online == false) {
                            return 'grayscale';
                        }
                    }}
                    dateFormatter="string"
                    toolBarRender={() => [
                        <Button key="button" type="primary" onClick={() => {
                            setRegisterOpen(true)
                        }}>
                            {t('gateways.register')}
                        </Button>,
                        <Button key="button" color={'purple'} variant={'filled'} onClick={() => {
                            setTokenManageOpen(true)
                        }}>
                            {t('gateways.token_manage')}
                        </Button>
                    ]}
                    polling={5000}
                />

                <AgentGatewayModal
                    id={selectedRowKey}
                    open={open}
                    confirmLoading={mutation.isPending}
                    handleCancel={() => {
                        setOpen(false);
                        setSelectedRowKey(undefined);
                    }}
                    handleOk={mutation.mutate}
                />

                <AgentGatewayRegister
                    open={registerOpen}
                    handleCancel={() => {
                        setRegisterOpen(false);
                    }}
                />

                <AgentGatewayTokenDrawer
                    open={tokenManageOpen}
                    onClose={() => {
                        setTokenManageOpen(false);
                    }}
                />

                <AgentGatewayStat
                    open={statOpen}
                    id={selectedRowKey}
                    onClose={() => {
                        setStatOpen(false);
                    }}
                />
            </Disabled>
        </div>
    );
};

export default AgentGatewayPage;