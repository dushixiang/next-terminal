import React, {useRef, useState} from 'react';
import {ActionType, ProColumns, ProTable} from "@ant-design/pro-components";
import {App, Button, Popconfirm, Progress} from "antd";
import {useTranslation} from "react-i18next";
import {useMutation} from "@tanstack/react-query";
import agentGatewayApi, {AgentGateway} from "@/src/api/agent-gateway-api";
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

    const JudgeLoadBusy = (load: number, cores: number) => {
        const ratio = load / cores;

        if (ratio < 0.7) return <div className={'text-green-400'}>{t('gateways.load.normal')}</div>;      // 系统空闲
        if (ratio < 1.0) return <div className={'text-orange-400'}>{t('gateways.load.moderate')}</div>;     // 轻度繁忙
        return <div className={'text-red-400'}>{t('gateways.load.busy')}</div>;                         // 资源紧张
    }

    let columns: ProColumns<AgentGateway>[] = [
        {
            title: t('gateways.name'),
            dataIndex: 'name',
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
                    rowClassName={(record) => {
                        if (record.online == false) {
                            return 'grayscale';
                        }
                    }}
                    dateFormatter="string"
                    headerTitle={t('menus.gateway.submenus.agent_gateway')}
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
                    polling={1000}
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