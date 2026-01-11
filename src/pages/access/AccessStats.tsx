import React, {useEffect, useState} from 'react';
import {
    ArrowUpDownIcon,
    CpuIcon,
    EyeIcon,
    EyeOffIcon,
    HardDriveIcon,
    MemoryStickIcon,
    MonitorCogIcon,
    MonitorPlayIcon
} from "lucide-react";
import {Tooltip} from "antd";
import {ChartConfig, ChartContainer} from "@/components/ui/chart";
import {Pie, PieChart} from "recharts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {useTranslation} from "react-i18next";
import portalApi, {CPUUsage, Stats} from "@/api/portal-api";
import {useQuery} from "@tanstack/react-query";
import strings from "@/utils/strings";
import {renderSize} from "@/utils/utils";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Skeleton} from "@/components/ui/skeleton";
import {cn} from "@/lib/utils";
import {CpuProgressBar} from '@/components/CpuProgressBar';


const defaultStats = {
    "info": {
        "id": "",
        "name": "",
        "version": "",
        "arch": "",
        "uptime": 0,
        "upDays": 0,
        "hostname": ""
    },
    "load": {
        "load1": "0",
        "load5": "0",
        "load15": "0",
        "runningProcess": "0",
        "totalProcess": "0"
    },
    "memory": {
        "memTotal": 0,
        "memAvailable": 0,
        "memFree": 0,
        "memBuffers": 0,
        "memCached": 0,
        "memUsed": 0,
        "swapTotal": 0,
        "swapFree": 0
    },
    "fileSystems": [],
    "network": [],
    "cpu": [
        {
            "user": 0,
            "nice": 0,
            "system": 0,
        }
    ]
}

const CpuList = ({cpus}: { cpus: CPUUsage[] }) => {
    return (
        <ScrollArea style={{maxHeight: 220}}>
            <div className="overflow-y-auto space-y-1 px-2">
                {cpus.map((cpu, index) => (
                    <div key={index} className="flex gap-2 items-center py-1">
                        <span className="w-6 text-right text-xs text-gray-400">{index + 1}</span>
                        <CpuProgressBar cpu={cpu} index={index}/>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
};

interface Props {
    sessionId: string;
    open: boolean;
}

const AccessStats = ({sessionId, open}: Props) => {

    let {t} = useTranslation();

    let [stats, setStats] = useState<Stats>(defaultStats);
    let [hideVNic, setHideVNic] = useState(true);

    let statsQuery = useQuery({
        queryKey: ['stats', sessionId],
        queryFn: context => {
            return portalApi.stats(sessionId)
        },
        refetchInterval: 2000,
        enabled: open && strings.hasText(sessionId),
    });

    useEffect(() => {
        if (statsQuery.data) {
            setStats(statsQuery.data);
        }
    }, [statsQuery.data]);

    const ready = () => {
        return stats.info.id !== '';
    }

    return (
        <ScrollArea style={{
            height: 'calc(100vh - 80px)',
        }}>
            <div className={'space-y-2 p-2'}>
                <div className={'border rounded-md p-4'}>
                    <div className={'flex gap-2 items-center'}>
                        <MonitorCogIcon className={'w-4 h-4 text-blue-500'}/>
                        <div className={'font-medium'}>{t('stat.info.system')}</div>
                    </div>
                    <div className={'mt-2 grid grid-cols-2 gap-1 text-xs'}>
                        {ready() ?
                            <>
                                <div className={'flex gap-1 items-center'}>
                                    <span>{t('stat.info.hostname')}:</span>
                                    <Tooltip title={stats.info?.hostname}>
                                        <span
                                            className={'bg-[#313131] rounded-lg py-1 px-1.5 text-center text-blue-500 line-clamp-1'}>
                                        {stats.info?.hostname.length > 8 ? stats.info?.hostname.substring(0, 8) + '..' : stats.info?.hostname}
                                    </span>
                                    </Tooltip>

                                </div>
                                <div className={'flex gap-1 items-center'}>
                                    <span>{t('stat.info.uptime')}:</span>
                                    <span
                                        className={'bg-[#313131] rounded-lg py-1 px-1.5 text-center text-blue-500'}>
                                        {stats.info?.upDays}
                                        {t('stat.days')}
                                    </span>
                                </div>
                                <div className={'flex gap-1 items-center'}>
                                    <span>{t('stat.info.os')}:</span>
                                    <span
                                        className={'bg-[#313131] rounded-lg py-1 px-1.5 text-center text-blue-500'}>
                                        {stats.info?.id}
                                    </span>
                                </div>
                                <div className={'flex gap-1 items-center'}>
                                    <span>{t('stat.info.arch')}:</span>
                                    <span
                                        className={'bg-[#313131] rounded-lg py-1 px-1.5 text-center text-blue-500'}>
                                        {stats.info?.arch}
                                    </span>
                                </div>
                            </> :
                            <>
                                <Skeleton className="h-6"/>
                                <Skeleton className="h-6"/>
                                <Skeleton className="h-6"/>
                                <Skeleton className="h-6"/>
                            </>
                        }
                    </div>
                </div>

                <div className={'border rounded-md p-4'}>
                    <div className={'flex gap-2 items-center'}>
                        <MonitorPlayIcon className={'w-4 h-4 text-blue-500'}/>
                        <div className={'font-medium'}>{t('stat.info.load')}</div>
                    </div>
                    <div className={'mt-2 grid grid-cols-3 gap-1 text-xs'}>
                        {ready() ?
                            <>
                                <div className={'flex gap-1 items-center'}>
                                    <span>Load1:</span>
                                    <span
                                        className={'bg-[#313131] rounded-lg py-1 px-1.5 text-center text-blue-500'}>
                                        {stats.load?.load1}
                                    </span>
                                </div>
                                <div className={'flex gap-1 items-center'}>
                                    <span>Load5:</span>
                                    <span
                                        className={'bg-[#313131] rounded-lg py-1 px-1.5 text-center text-blue-500'}>
                                        {stats.load?.load5}
                                    </span>
                                </div>
                                <div className={'flex gap-1 items-center'}>
                                    <span>Load15:</span>
                                    <span
                                        className={'bg-[#313131] rounded-lg py-1 px-1.5 text-center text-blue-500'}>
                                        {stats.load?.load15}
                                    </span>
                                </div>
                            </> :
                            <>
                                <Skeleton className="h-6"/>
                                <Skeleton className="h-6"/>
                                <Skeleton className="h-6"/>
                            </>
                        }
                    </div>
                </div>

                <div className={'border rounded-md p-4'}>
                    <div className={'flex gap-2 items-center'}>
                        <CpuIcon className={'w-4 h-4 text-blue-500'}/>
                        <div className={'font-medium'}>{t('stat.info.cpu')}</div>
                    </div>
                    <div className={cn('mt-2 grid gap-1')}>
                        {ready() ? <CpuList cpus={stats.cpu}/> : <Skeleton className="h-[300px]"/>}
                    </div>
                </div>

                <div className={'border rounded-md p-4'}>
                    <div className={'flex gap-2 items-center'}>
                        <MemoryStickIcon className={'w-4 h-4 text-blue-500'}/>
                        <div className={'font-medium'}>{t('stat.memory.label')}</div>
                        <div className={'text-xs space-x-1'}>
                        <span
                            className={'text-blue-500'}>{renderSize(stats.memory?.memUsed)}</span>
                            <span className={'text-indigo-500'}>/</span>
                            <span className={'text-gray-500'}>{renderSize(stats.memory?.memTotal)}</span>
                        </div>
                    </div>

                    <div className={'text-xs grid grid-cols-4 items-center gap-2'}>
                        <div className={'space-y-1.5'}>
                            <div className={'flex gap-2 items-center'}>
                                <span className={'w-1.5 h-1.5 rounded-md bg-red-500'}/>
                                <span>{t('stat.memory.used')}</span>
                            </div>
                            <div>
                                {renderSize(stats.memory?.memUsed, 0)}
                            </div>
                        </div>

                        <div className={'space-y-1.5'}>
                            <div className={'flex gap-2 items-center'}>
                                <span className={'w-1.5 h-1.5 rounded-md bg-green-500'}/>
                                <span>{t('stat.memory.free')}</span>
                            </div>
                            <div>
                                {renderSize(stats.memory?.memFree, 0)}
                            </div>
                        </div>

                        <div className={'space-y-1.5'}>
                            <div className={'flex gap-2 items-center'}>
                                <span className={'w-1.5 h-1.5 rounded-md bg-gray-500'}/>
                                <span>{t('stat.memory.cache')}</span>
                            </div>
                            <div>
                                {renderSize(stats.memory?.memCached, 0)}
                            </div>
                        </div>

                        <ChartContainer
                            config={{} satisfies ChartConfig}
                            className="aspect-square w-[80px] h-[80px]"
                        >
                            <PieChart>
                                <Pie
                                    data={[
                                        {
                                            name: t('stat.memory.used'),
                                            value: stats.memory?.memTotal - stats.memory?.memAvailable,
                                            fill: "#EF4444"
                                        },
                                        {name: t('stat.memory.free'), value: stats.memory?.memFree, fill: "#22C55F"},
                                        {name: t('stat.memory.cache'), value: stats.memory?.memCached, fill: "#6B7280"},
                                    ]}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={20}
                                />
                            </PieChart>
                        </ChartContainer>
                    </div>
                </div>

                <div className={'border rounded-md p-4'}>
                    <div className={'flex gap-2 items-center'}>
                        <ArrowUpDownIcon className={'w-4 h-4 text-blue-500'}/>
                        <div className={'font-medium flex-grow'}>{t('stat.network.label')}</div>

                        <div>
                            {hideVNic ?
                                <EyeOffIcon className={'w-4 h-4 cursor-pointer'} onClick={() => setHideVNic(false)}/>
                                :
                                <EyeIcon className={'w-4 h-4 cursor-pointer'} onClick={() => setHideVNic(true)}/>
                            }
                        </div>
                    </div>

                    <Table className={'mt-2 text-xs text-center'}>
                        <TableHeader>
                            <TableRow>
                                <TableHead className={'p-2 h-0 text-center'}>{t('stat.network.interface')}</TableHead>
                                <TableHead className={'p-2 h-0 text-center'}>{t('stat.network.tx')}</TableHead>
                                <TableHead className={'p-2 h-0 text-center'}>{t('stat.network.rx')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.network?.filter(item => {
                                if (hideVNic) {
                                    if (item.iface.includes('br')) {
                                        return false;
                                    }
                                    if (item.iface.includes('veth')) {
                                        return false;
                                    }
                                    if (item.iface.includes('cali')) {
                                        return false;
                                    }
                                }
                                return true;
                            }).map((net) => (
                                <TableRow key={net.iface}>
                                    <TableCell className="p-2">{net.iface}</TableCell>
                                    <TableCell className={'p-2'}>

                                        {renderSize(net.txSec, 1)}/s
                                    </TableCell>
                                    <TableCell className={'p-2'}>
                                        {renderSize(net.rxSec, 1)}/s
                                    </TableCell>
                                    <TableCell className={'p-2'}>
                                        <div className={'bg-blue-700 rounded-md'}>

                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className={'border rounded-md p-4'}>
                    <div className={'flex gap-2 items-center'}>
                        <HardDriveIcon className={'w-4 h-4 text-blue-500'}/>
                        <div className={'font-medium'}>{t('stat.disk.label')}</div>
                    </div>

                    <Table className={'mt-2 text-xs text-center'}>
                        <TableHeader>
                            <TableRow>
                                <TableHead className={'p-2 h-0 text-center'}>{t('stat.disk.mount_point')}</TableHead>
                                <TableHead className={'p-2 h-0 text-center'}>{t('stat.disk.total')}</TableHead>
                                <TableHead className={'p-2 h-0 text-center'}>{t('stat.disk.free')}</TableHead>
                                <TableHead className={'p-2 h-0 text-center'}>{t('stat.disk.percent')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.fileSystems?.map((fs) => (
                                <TableRow key={fs.mountPoint}>
                                    <TableCell className="p-2">{fs.mountPoint}</TableCell>
                                    <TableCell className={'p-2'}>{renderSize(fs.total, 1)}</TableCell>
                                    <TableCell className={'p-2'}>{renderSize(fs.free, 1)}</TableCell>
                                    <TableCell className={'p-2'}>
                                        <div className={'bg-blue-700 rounded-md'}>
                                            {(fs.percent * 100).toFixed(0)}%
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                </div>
            </div>
        </ScrollArea>
    );
};

export default AccessStats;