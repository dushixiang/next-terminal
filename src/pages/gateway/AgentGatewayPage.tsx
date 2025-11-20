import React, {useRef, useState} from 'react';
import {ActionType, DragSortTable, ProColumns} from "@ant-design/pro-components";
import {App, Button, Popconfirm, Progress, Tooltip} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import agentGatewayApi, {AgentGateway, SortPositionRequest} from "@/api/agent-gateway-api";
import AgentGatewayModal from "@/pages/gateway/AgentGatewayModal";
import AgentGatewayRegister from "@/pages/gateway/AgentGatewayRegister";
import NButton from "@/components/NButton";
import {useLicense} from "@/hook/use-license";
import AgentGatewayTokenDrawer from "@/pages/gateway/AgentGatewayTokenDrawer";
import {ArrowDownIcon, ArrowUpIcon, HardDriveDownloadIcon, HardDriveUploadIcon} from "lucide-react";
import {formatUptimeEn, getColor, renderSize} from "@/utils/utils";
import AgentGatewayStat from "@/pages/gateway/AgentGatewayStat";
import {getSort} from "@/utils/sort";

const api = agentGatewayApi;

const linuxImg = new URL('@/assets/images/linux.png', import.meta.url).href;
const windowsImg = new URL('@/assets/images/windows.png', import.meta.url).href;
const macosImg = new URL('@/assets/images/macos.png', import.meta.url).href;

const AgentGatewayPage = () => {

    const {t} = useTranslation();
    const actionRef = useRef<ActionType>(null);

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
        mutationFn: (req: SortPositionRequest) => api.updateSortPosition(req),
        onSuccess: () => {
            // 不立即重新加载，让 polling 自然更新数据
            message.success(t('general.success'));
        }
    });

    function showSuccess() {
        message.open({
            type: 'success',
            content: t('general.success'),
        });
    }

    const handleDragSortEnd = (beforeIndex: number, afterIndex: number, newDataSource: AgentGateway[]) => {
        // console.log('排序操作', {beforeIndex, afterIndex});

        // 立即更新本地状态，避免闪烁
        setDataSource(newDataSource);

        // 获取被拖拽的项
        const draggedItem = newDataSource[afterIndex];

        // 因为使用 DESC 排序，sort 大的在前面
        // 所以 beforeId 对应的 sort 应该更大，afterId 对应的 sort 应该更小
        const req: SortPositionRequest = {
            id: draggedItem.id,
            // 前一项的 sort 更大（DESC 排序）
            beforeId: afterIndex > 0 ? newDataSource[afterIndex - 1].id : '',
            // 后一项的 sort 更小（DESC 排序）
            afterId: afterIndex < newDataSource.length - 1 ? newDataSource[afterIndex + 1].id : ''
        };

        console.log('排序请求', req);

        // 服务器更新
        updateSortMutation.mutate(req);
    };

    const JudgeLoadBusy = (load: number, cores: number) => {
        const ratio = load / cores;

        if (ratio < 0.7) return <div className={'text-green-400'}>{t('gateways.load.normal')}</div>;      // 系统空闲
        if (ratio < 1.0) return <div className={'text-orange-400'}>{t('gateways.load.moderate')}</div>;     // 轻度繁忙
        return <div className={'text-red-400'}>{t('gateways.load.busy')}</div>;                         // 资源紧张
    }

    let columns: ProColumns<AgentGateway>[] = [
        {
            title: t('assets.sort'),
            dataIndex: 'sort',
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

    const registerLimitReached = license.isFree() && dataSource.length >= 1;

    const renderRegisterButton = () => {
        const button = (
            <Button
                type="primary"
                disabled={registerLimitReached}
                onClick={() => {
                    setRegisterOpen(true)
                }}
            >
                {t('gateways.register')}
            </Button>
        );

        if (registerLimitReached) {
            return (
                <Tooltip key="register-button" title={t('gateways.free_limit_tip')}>
                    <span style={{display: 'inline-block'}}>
                        {button}
                    </span>
                </Tooltip>
            );
        }

        return React.cloneElement(button, {key: 'register-button'});
    };

    return (
        <div className={'w-full'}>
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
                        let [sortOrder, sortField] = getSort(sort);
                        if (sortOrder === "" && sortField === "") {
                            sortOrder = "desc";  // 使用降序，让最大的 sort 显示在最上面
                            sortField = "sort";
                        }

                        let queryParams = {
                            pageIndex: params.current,
                            pageSize: params.pageSize,
                            sortOrder: sortOrder,
                            sortField: sortField,
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
                    dragSortKey="sort"
                    onDragSortEnd={handleDragSortEnd}
                    rowClassName={(record) => {
                        if (record.online == false) {
                            return 'grayscale';
                        }
                    }}
                    dateFormatter="string"
                    toolBarRender={() => [
                        renderRegisterButton(),
                        <Button key="token-manage" color={'purple'} variant={'filled'} onClick={() => {
                            setTokenManageOpen(true)
                        }}>
                            {t('gateways.token_manage')}
                        </Button>
                    ]}
                    polling={5000}
                    // style={{
                    //     width: '400px',
                    // }}
                    // scroll={{
                    //     x: 'max-content'
                    // }}
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
        </div>
    );
};

export default AgentGatewayPage;
