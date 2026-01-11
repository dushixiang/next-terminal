import React from 'react';
import {Drawer, Card, Progress, Tag, Divider} from "antd";
import {useQuery} from "@tanstack/react-query";
import agentGatewayApi from "@/api/agent-gateway-api";
import {
    Cpu,
    Server,
    MemoryStick,
    HardDrive,
    Network,
    ArrowUp,
    ArrowDown,
    Clock,
    Activity
} from 'lucide-react';
import {formatUptime, renderSize} from "@/utils/utils";
import clsx from "clsx";

interface Props {
    open: boolean;
    id: string;
    onClose: () => void;
}

const AgentGatewayStat = ({open, id, onClose}: Props) => {
    let query = useQuery({
        queryKey: ['agent-gateway', id, 'stat'],
        queryFn: async () => {
            return await agentGatewayApi.getStat(id);
        },
        enabled: open,
        refetchInterval: 3000, // 每3秒刷新一次
    });

    const data = query.data;

    return (
        <Drawer
            title={
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5"/>
                    <span>网关监控</span>
                    {data?.ping && (
                        <Tag color="green">延迟: {data.ping}ms</Tag>
                    )}
                </div>
            }
            onClose={onClose}
            open={open}
            width={Math.min(1200, window.innerWidth - 100)}
        >
            <div className="flex flex-col gap-4">
                {/* 系统信息卡片 */}
                <Card
                    size="small"
                    title={
                        <div className="flex items-center gap-2">
                            <Server className="h-4 w-4"/>
                            <span>系统信息</span>
                        </div>
                    }
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <div className="text-gray-500 text-sm">主机名</div>
                            <div className="font-medium">{data?.host.hostname || '-'}</div>
                        </div>
                        <div>
                            <div className="text-gray-500 text-sm">操作系统</div>
                            <div className="font-medium">{data?.host.os || '-'} / {data?.host.arch || '-'}</div>
                        </div>
                        <div>
                            <div className="text-gray-500 text-sm">系统版本</div>
                            <div className="font-medium">{data?.host.version || '-'}</div>
                        </div>
                        <div>
                            <div className="text-gray-500 text-sm flex items-center gap-1">
                                <Clock className="h-3 w-3"/>
                                运行时间
                            </div>
                            <div className="font-medium">{formatUptime(data?.host.uptime)}</div>
                        </div>
                    </div>
                    {data?.load && (
                        <>
                            <Divider className="my-3"/>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <div className="text-gray-500 text-sm">负载 (1分钟)</div>
                                    <div className="font-medium">{data.load.load_1?.toFixed(2) || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 text-sm">负载 (5分钟)</div>
                                    <div className="font-medium">{data.load.load_5?.toFixed(2) || '-'}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 text-sm">负载 (15分钟)</div>
                                    <div className="font-medium">{data.load.load_15?.toFixed(2) || '-'}</div>
                                </div>
                            </div>
                        </>
                    )}
                </Card>

                {/* 资源使用情况 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CPU 卡片 */}
                    <Card
                        size="small"
                        title={
                            <div className="flex items-center gap-2">
                                <Cpu className="h-4 w-4"/>
                                <span>CPU</span>
                            </div>
                        }
                    >
                        <div className="space-y-3">
                            <div>
                                <div className="text-gray-500 text-sm mb-1">型号</div>
                                <div className="text-xs font-mono">{data?.cpu.model || '-'}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-gray-500 text-sm">物理核心</div>
                                    <div className="font-medium">{data?.cpu.physical_cores || 0}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 text-sm">逻辑核心</div>
                                    <div className="font-medium">{data?.cpu.logical_cores || 0}</div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-gray-500 text-sm">使用率</span>
                                    <span className="font-medium">{data?.cpu.percent?.toFixed(1) || 0}%</span>
                                </div>
                                <Progress
                                    percent={data?.cpu.percent || 0}
                                    showInfo={false}
                                    strokeColor={
                                        (data?.cpu.percent || 0) > 80 ? '#f5222d' :
                                            (data?.cpu.percent || 0) > 60 ? '#faad14' : '#52c41a'
                                    }
                                />
                            </div>
                        </div>
                    </Card>

                    {/* 内存卡片 */}
                    <Card
                        size="small"
                        title={
                            <div className="flex items-center gap-2">
                                <MemoryStick className="h-4 w-4"/>
                                <span>内存</span>
                            </div>
                        }
                    >
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-gray-500 text-sm">总容量</div>
                                    <div className="font-medium">{renderSize(data?.memory.total)}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 text-sm">已使用</div>
                                    <div className="font-medium">{renderSize(data?.memory.used)}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 text-sm">可用</div>
                                    <div className="font-medium">{renderSize(data?.memory.available)}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 text-sm">空闲</div>
                                    <div className="font-medium">{renderSize(data?.memory.free)}</div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-gray-500 text-sm">使用率</span>
                                    <span className="font-medium">{data?.memory.percent?.toFixed(1) || 0}%</span>
                                </div>
                                <Progress
                                    percent={data?.memory.percent || 0}
                                    showInfo={false}
                                    strokeColor={
                                        (data?.memory.percent || 0) > 80 ? '#f5222d' :
                                            (data?.memory.percent || 0) > 70 ? '#faad14' : '#52c41a'
                                    }
                                />
                            </div>
                            {data?.memory.swap_total > 0 && (
                                <div className="pt-2 border-t">
                                    <div className="text-gray-500 text-sm mb-1">交换分区</div>
                                    <div className="flex justify-between text-xs">
                                        <span>总量: {renderSize(data.memory.swap_total)}</span>
                                        <span>空闲: {renderSize(data.memory.swap_free)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* 磁盘和网络 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 磁盘卡片 */}
                    <Card
                        size="small"
                        title={
                            <div className="flex items-center gap-2">
                                <HardDrive className="h-4 w-4"/>
                                <span>磁盘</span>
                            </div>
                        }
                    >
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-gray-500 text-sm">总容量</div>
                                    <div className="font-medium">{renderSize(data?.disk.total)}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500 text-sm">已使用</div>
                                    <div className="font-medium">{renderSize(data?.disk.used)}</div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-gray-500 text-sm">使用率</span>
                                    <span className="font-medium">{data?.disk.percent?.toFixed(1) || 0}%</span>
                                </div>
                                <Progress
                                    percent={data?.disk.percent || 0}
                                    showInfo={false}
                                    strokeColor={
                                        (data?.disk.percent || 0) > 90 ? '#f5222d' :
                                            (data?.disk.percent || 0) > 70 ? '#faad14' : '#52c41a'
                                    }
                                />
                            </div>
                            <Divider className="my-2"/>
                            <div>
                                <div className="text-gray-500 text-sm mb-2">磁盘 I/O 速率</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className={clsx(
                                        'flex items-center gap-2 px-3 py-2 rounded',
                                        'bg-green-50 dark:bg-green-900/20'
                                    )}>
                                        <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400"/>
                                        <div>
                                            <div className="text-xs text-gray-500">读取</div>
                                            <div className="font-medium text-green-600 dark:text-green-400">
                                                {renderSize(data?.disk_io.read_bytes)}/s
                                            </div>
                                        </div>
                                    </div>
                                    <div className={clsx(
                                        'flex items-center gap-2 px-3 py-2 rounded',
                                        'bg-red-50 dark:bg-red-900/20'
                                    )}>
                                        <ArrowDown className="h-4 w-4 text-red-600 dark:text-red-400"/>
                                        <div>
                                            <div className="text-xs text-gray-500">写入</div>
                                            <div className="font-medium text-red-600 dark:text-red-400">
                                                {renderSize(data?.disk_io.write_bytes)}/s
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* 网络卡片 */}
                    <Card
                        size="small"
                        title={
                            <div className="flex items-center gap-2">
                                <Network className="h-4 w-4"/>
                                <span>网络</span>
                            </div>
                        }
                    >
                        <div className="space-y-3">
                            <div>
                                <div className="text-gray-500 text-sm mb-2">网络 I/O 速率</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className={clsx(
                                        'flex items-center gap-2 px-3 py-2 rounded',
                                        'bg-green-50 dark:bg-green-900/20'
                                    )}>
                                        <ArrowUp className="h-4 w-4 text-green-600 dark:text-green-400"/>
                                        <div>
                                            <div className="text-xs text-gray-500">上传</div>
                                            <div className="font-medium text-green-600 dark:text-green-400">
                                                {renderSize(data?.network.tx_sec)}/s
                                            </div>
                                        </div>
                                    </div>
                                    <div className={clsx(
                                        'flex items-center gap-2 px-3 py-2 rounded',
                                        'bg-blue-50 dark:bg-blue-900/20'
                                    )}>
                                        <ArrowDown className="h-4 w-4 text-blue-600 dark:text-blue-400"/>
                                        <div>
                                            <div className="text-xs text-gray-500">下载</div>
                                            <div className="font-medium text-blue-600 dark:text-blue-400">
                                                {renderSize(data?.network.rx_sec)}/s
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-500 text-sm mb-2">累计流量</div>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="text-gray-500">上传: </span>
                                        <span className="font-medium">{renderSize(data?.network.tx)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">下载: </span>
                                        <span className="font-medium">{renderSize(data?.network.rx)}</span>
                                    </div>
                                </div>
                            </div>
                            <Divider className="my-2"/>
                            <div>
                                <div className="text-gray-500 text-sm mb-2">IP 地址</div>
                                <div className="space-y-2">
                                    {data?.network.external_ip && (
                                        <div className="flex items-center gap-2">
                                            <Tag color="blue">外部</Tag>
                                            <span className="font-mono text-sm">{data.network.external_ip}</span>
                                        </div>
                                    )}
                                    {data?.network.internal_ips && data.network.internal_ips.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Tag color="green">内部</Tag>
                                                <span className="text-xs text-gray-500">
                                                    ({data.network.internal_ips.length} 个)
                                                </span>
                                            </div>
                                            <div className="pl-16 space-y-1">
                                                {data.network.internal_ips.map((ip, index) => (
                                                    <div key={index} className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                                        {ip}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* 错误信息 */}
                {data?.errors && Object.keys(data.errors).length > 0 && (
                    <Card
                        size="small"
                        title={<span className="text-red-600">采集错误</span>}
                    >
                        <div className="space-y-2">
                            {Object.entries(data.errors).map(([key, value]) => (
                                <div key={key} className="text-sm">
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{key}: </span>
                                    <span className="text-red-600">{value}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </Drawer>
    );
};

export default AgentGatewayStat;
