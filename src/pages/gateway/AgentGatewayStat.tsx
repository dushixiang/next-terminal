import React from 'react';
import {Drawer} from "antd";
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import agentGatewayApi from "@/src/api/agent-gateway-api";
import {CpuChart} from "@/src/components/charts/CpuChart";
import {
    ArrowDownIcon,
    ArrowUpIcon,
    CpuIcon,
    EthernetPortIcon,
    HardDriveDownloadIcon,
    HardDriveIcon,
    HardDriveUploadIcon,
    MemoryStickIcon,
    ServerIcon
} from 'lucide-react';
import {formatUptime, renderSize} from "@/src/utils/utils";
import {MemoryChart} from "@/src/components/charts/MemoryChart";
import {ConnChart} from "@/src/components/charts/ConnChart";
import {StateChart} from "@/src/components/charts/StateChart";

interface Props {
    open: boolean;
    id: string;
    onClose: () => void;
}

const AgentGatewayStat = ({open, id, onClose}: Props) => {
    let {t} = useTranslation();

    let query = useQuery({
        queryKey: ['agent-gateway', id, 'stat'],
        queryFn: async () => {
            return await agentGatewayApi.getStat(id);
        },
        enabled: open,
        refetchInterval: 1000,
    });

    return (
        <div>
            <Drawer title={t('gateways.stat.label')}
                    onClose={onClose}
                    open={open}
                    width={window.innerWidth - 200}
            >
                <div>

                    <div className={'mt-2 grid grid-cols-1 gap-2'}>
                        <div className={'flex items-center gap-2 text-sm'}>
                            <ServerIcon className={'h-4 w-4'}/>
                            <div className={'font-medium'}>
                                {t('gateways.stat.system')}
                            </div>
                            <div>
                                {t('gateways.os')}: {query.data?.host.os}/{query.data?.host.arch}
                            </div>
                            <div>
                                {t('gateways.stat.uptime')}: {formatUptime(query.data?.host.uptime)}
                            </div>
                        </div>
                        <div className={'flex items-center gap-2 text-sm'}>
                            <CpuIcon className={'h-4 w-4'}/>
                            <div className={'font-medium'}>
                                {t('gateways.stat.cpu')}
                            </div>
                            <div>
                                {t('gateways.stat.model')}: {query.data?.cpu.model}
                            </div>
                            <div>
                                {t('gateways.stat.logical_cores')}: {query.data?.cpu.logical_cores}
                            </div>
                            <div>
                                {t('gateways.stat.physical_cores')}: {query.data?.cpu.physical_cores}
                            </div>
                            <div>
                                {t('gateways.stat.percent')}: {query.data?.cpu.percent.toFixed(2)}%
                            </div>
                        </div>
                        <div className={'flex items-center gap-2 text-sm'}>
                            <MemoryStickIcon className={'h-4 w-4'}/>
                            <div className={'font-medium'}>
                                {t('gateways.stat.memory')}
                            </div>
                            <div>
                                {t('gateways.stat.total')}: {renderSize(query.data?.memory.total)}
                            </div>
                            <div>
                                {t('gateways.stat.used')}: {renderSize(query.data?.memory.used)}
                            </div>
                            <div>
                                {t('gateways.stat.percent')}: {query.data?.memory.percent.toFixed(2)}%
                            </div>
                        </div>
                        <div className={'flex items-center gap-2 text-sm'}>
                            <HardDriveIcon className={'h-4 w-4'}/>
                            <div className={'font-medium'}>
                                {t('gateways.stat.disk')}
                            </div>
                            <div>{t('gateways.stat.total')}: {renderSize(query.data?.disk.total)}</div>
                            <div>{t('gateways.stat.used')}: {renderSize(query.data?.disk.used)}</div>
                            <div>{t('gateways.stat.percent')}: {query.data?.disk.percent.toFixed(2)}%</div>

                            <div className={'flex items-center gap-1'}>
                                <div>I/O</div>
                                <div className="flex items-center gap-1 text-sm">
                                    <div className={'flex items-center gap-1 text-green-500'}>
                                        <HardDriveUploadIcon className={'h-4 w-4 '}/>
                                        <div>{renderSize(query.data?.disk_io.read_bytes)}/s</div>
                                    </div>
                                    <div className={'flex items-center gap-1 text-red-500'}>
                                        <HardDriveDownloadIcon className={'h-4 w-4 '}/>
                                        <div>{renderSize(query.data?.disk_io.write_bytes)}/s</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={'flex items-center gap-2 text-sm'}>
                            <EthernetPortIcon className={'h-4 w-4'}/>
                            <div className={'font-medium'}>
                                {t('gateways.stat.network')}
                            </div>
                            <div>{t('gateways.stat.external_ip')}: {query.data?.network.external_ip}</div>
                            <div>{t('gateways.stat.internal_ips')}: {query.data?.network.internal_ips?.join(',')}</div>

                            <div>I/O</div>
                            <div className="flex items-center gap-1 text-sm">
                                <div className={'flex items-center gap-1 text-green-500'}>
                                    <ArrowUpIcon className={'h-4 w-4 '}/>
                                    <div>{renderSize(query.data?.network.tx_sec)}/s</div>
                                </div>
                                <div className={'flex items-center gap-1 text-red-500'}>
                                    <ArrowDownIcon className={'h-4 w-4 '}/>
                                    <div>{renderSize(query.data?.network.rx_sec)}/s</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={'mt-4 grid grid-cols-2 gap-4'}>
                    <CpuChart title={t('gateways.stat.cpu')} data={query.data?.cpu?.history || []}/>
                    <MemoryChart title={t('gateways.stat.memory')} data={query.data?.memory.history || []}/>
                    {/*<NetIOChart title={t('gateways.stat.network_io')} data={query.data?.network?.history || []}/>*/}
                    {/*<DiskIOChart title={t('gateways.stat.disk_io')} data={query.data?.disk_io?.history || []}/>*/}
                    <ConnChart title={t('gateways.stat.connections')} data={query.data?.connections || []}/>
                    <StateChart title={t('gateways.stat.tcp_states')} data={query.data?.tcp_states || []}/>
                </div>
            </Drawer>
        </div>
    );
};

export default AgentGatewayStat;