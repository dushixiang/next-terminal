import i18n from '@/react-i18next/i18n';
import {Alert, App, Button, Col, Empty, Progress, Row, Spin, Tag, Typography} from "antd";
import type {ReactNode} from "react";
import {
    ActivityIcon,
    CpuIcon,
    DatabaseIcon,
    HardDriveIcon,
    MemoryStickIcon,
    RadioTowerIcon,
    RefreshCwIcon,
    ServerIcon,
    ShieldAlertIcon,
    TerminalIcon,
} from "lucide-react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import monitoringApi, {HealthCheckItem, MonitorAlertState, StorageVolume} from "@/api/monitoring-api";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";
import GaugeMetricPanel, {type GaugeStatus} from "@/pages/sysops/components/GaugeMetricPanel";

const formatBytes = (value: number) => {
    if (!value || value <= 0) {
        return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size = size / 1024;
        unitIndex += 1;
    }
    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) {
        return `${days}d ${hours}h`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
};

const formatTime = (value?: number) => value ? new Date(value).toLocaleString(i18n.resolvedLanguage || i18n.language) : '-';

const percent = (value: number) => Math.max(0, Math.min(100, Math.round(value || 0)));

const statusColor = (status: string) => {
    if (status === 'ok') return 'success';
    if (status === 'warning') return 'warning';
    if (status === 'critical' || status === 'error') return 'error';
    if (status === 'acknowledged') return 'processing';
    if (status === 'active') return 'error';
    return 'default';
};

const levelColor = (level: string) => {
    if (level === 'critical') return 'red';
    if (level === 'warning') return 'orange';
    return 'blue';
};

const metricIcon = (metric: string) => {
    if (metric === 'cpu') return <CpuIcon className="h-4 w-4"/>;
    if (metric === 'memory') return <MemoryStickIcon className="h-4 w-4"/>;
    return <HardDriveIcon className="h-4 w-4"/>;
};

const excludedHealthKeys = ['storage', 'cpu', 'memory'];

const StoragePanel = ({volume, title, statusText}: { volume?: StorageVolume; title: string; statusText: Record<GaugeStatus, string> }) => (
    <GaugeMetricPanel
        icon={<HardDriveIcon className="h-5 w-5"/>}
        title={title}
        value={volume?.percent || 0}
        subTitle={volume?.path || '-'}
        statusText={statusText}
        extra={(
            <>
                <div>{formatBytes(volume?.usedBytes || 0)} / {formatBytes(volume?.totalBytes || 0)}</div>
                <div className="text-right">{formatBytes(volume?.freeBytes || 0)}</div>
            </>
        )}
    />
);

const SystemMonitorPage = () => {
    const {t} = useTranslation();
    const {isMobile} = useMobile();
    const {message} = App.useApp();
    const queryClient = useQueryClient();

    const overviewQuery = useQuery({
        queryKey: ['monitoringOverview'],
        queryFn: monitoringApi.getOverview,
        refetchInterval: 5000,
    });

    const acknowledgeMutation = useMutation({
        mutationFn: monitoringApi.acknowledgeAlert,
        onSuccess: async () => {
            message.success(t('general.success'));
            await queryClient.invalidateQueries({queryKey: ['monitoringOverview']});
            await queryClient.invalidateQueries({queryKey: ['monitoringGlobalStatus']});
        },
    });

    const overview = overviewQuery.data;
    const health = overview?.health ?? [];
    const visibleHealth = health.filter(item => !excludedHealthKeys.includes(item.key));
    const alertStates = overview?.alertStates ?? [];
    const protocols = overview?.protocols ?? [];
    const storageVolumes = overview?.host.storage ?? [];
    const primaryStorage = storageVolumes[0];
    const gaugeStatusText: Record<GaugeStatus, string> = {
        ok: t('sysops.monitoring.status.ok'),
        warning: t('sysops.monitoring.status.warning'),
        critical: t('sysops.monitoring.status.critical'),
    };
    const cpuSubTitle = overview?.host.cpu.modelName || `${overview?.host.cpu.logicalCores ?? 0} ${t('sysops.monitoring.logical_cores')}`;
    const storageVolumeTitle = (volume?: StorageVolume) => {
        if (!volume?.name) {
            return t('sysops.monitoring.storage_volumes.storage');
        }
        return t(`sysops.monitoring.storage_volumes.${volume.name}`, volume.name);
    };

    const renderHealth = (item: HealthCheckItem) => {
        const messageStatus = item.key === 'gateway' && item.message === 'no gateway configured' ? 'not_configured' : item.status;
        return (
            <div key={item.key} className="flex items-start justify-between gap-3 rounded border border-gray-100 p-3 dark:border-gray-800">
                <div className="min-w-0">
                    <div className="font-medium">{t(`sysops.monitoring.health.${item.key}`, item.key)}</div>
                    <div className="mt-1 break-all text-xs text-gray-500">
                        {item.status === 'error' ? item.message : t(`sysops.monitoring.health_messages.${item.key}.${messageStatus}`, item.message)}
                    </div>
                </div>
                <Tag color={statusColor(item.status)}>{t(`sysops.monitoring.status.${item.status}`, item.status)}</Tag>
            </div>
        );
    };

    const renderAlertState = (item: MonitorAlertState) => (
        <div key={item.key} className="rounded border border-gray-100 p-3 dark:border-gray-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                        {metricIcon(item.metric)}
                        <span>{t(`sysops.monitoring.metrics.${item.metric}`, item.metric)}</span>
                        <Tag color={levelColor(item.level)}>{t(`sysops.monitoring.levels.${item.level}`, item.level)}</Tag>
                        <Tag color={statusColor(item.status)}>{t(`sysops.monitoring.alert_status.${item.status}`, item.status)}</Tag>
                    </div>
                    <div className="mt-1 break-all text-xs text-gray-500">
                        {item.target} · {item.currentValue.toFixed(1)}% / {item.level === 'critical' ? item.criticalThreshold : item.warningThreshold}%
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                        {t('sysops.monitoring.last_triggered_at')}: {formatTime(item.lastTriggeredAt)}
                    </div>
                </div>
                {item.status === 'active' && (
                    <Button
                        size="small"
                        loading={acknowledgeMutation.isPending}
                        onClick={() => acknowledgeMutation.mutate(item.key)}
                    >
                        {t('sysops.monitoring.acknowledge')}
                    </Button>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className={cn('flex gap-3', isMobile ? 'flex-col' : 'items-start justify-between')}>
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Typography.Title level={4} className="!mb-0">
                            {t('sysops.monitoring.title')}
                        </Typography.Title>
                        {overview && <Tag color={statusColor(overview.service.status)}>{t(`sysops.monitoring.status.${overview.service.status}`)}</Tag>}
                    </div>
                    <Typography.Text type="secondary">
                        {t('sysops.monitoring.description')}
                    </Typography.Text>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {overview && (
                        <div className="text-xs text-gray-500">
                            {t('sysops.monitoring.generated_at')}: {new Date(overview.generatedAt).toLocaleString(i18n.resolvedLanguage || i18n.language)}
                        </div>
                    )}
                    <Button
                        icon={<RefreshCwIcon className="h-4 w-4"/>}
                        loading={overviewQuery.isFetching}
                        onClick={() => overviewQuery.refetch()}
                    >
                        {t('actions.refresh')}
                    </Button>
                </div>
            </div>

            {overviewQuery.isLoading && (
                <div className="flex min-h-[360px] items-center justify-center">
                    <Spin/>
                </div>
            )}

            {overviewQuery.isError && (
                <Alert
                    showIcon
                    type="error"
                    title={t('sysops.monitoring.load_failed')}
                    description={(overviewQuery.error as Error).message}
                />
            )}

            {overview && (
                <>
                    {alertStates.some(item => item.level === 'critical') && (
                        <Alert
                            showIcon
                            type="error"
                            title={t('sysops.monitoring.critical_alert')}
                            description={t('sysops.monitoring.critical_alert_desc')}
                        />
                    )}

                    <Row gutter={[16, 16]}>
                        <Col xs={24} lg={8}>
                            <GaugeMetricPanel
                                icon={<CpuIcon className="h-5 w-5"/>}
                                title={t('sysops.monitoring.metrics.cpu')}
                                value={overview.host.cpu.percent}
                                subTitle={cpuSubTitle}
                                statusText={gaugeStatusText}
                                extra={(
                                    <>
                                        <div>{overview.host.cpu.logicalCores} {t('sysops.monitoring.logical_cores')}</div>
                                        <div className="text-right">1m/5m: {overview.host.cpu.load1}/{overview.host.cpu.load5}</div>
                                    </>
                                )}
                            />
                        </Col>
                        <Col xs={24} lg={8}>
                            <GaugeMetricPanel
                                icon={<MemoryStickIcon className="h-5 w-5"/>}
                                title={t('sysops.monitoring.metrics.memory')}
                                value={overview.host.memory.percent}
                                subTitle={`${formatBytes(overview.host.memory.usedBytes)} / ${formatBytes(overview.host.memory.totalBytes)}`}
                                statusText={gaugeStatusText}
                                extra={(
                                    <>
                                        <div>{t('sysops.monitoring.available')}: {formatBytes(overview.host.memory.availableBytes)}</div>
                                        <div className="text-right">
                                            {t('sysops.monitoring.swap')}: {formatBytes(overview.host.memory.swapUsedBytes)} / {formatBytes(overview.host.memory.swapTotalBytes)}
                                        </div>
                                    </>
                                )}
                            />
                        </Col>
                        {primaryStorage && (
                            <Col xs={24} lg={8}>
                                <StoragePanel volume={primaryStorage} title={storageVolumeTitle(primaryStorage)} statusText={gaugeStatusText}/>
                            </Col>
                        )}
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} lg={8}>
                            <div className="h-full rounded-lg border border-gray-100 p-4 dark:border-gray-800">
                                <div className="mb-4 flex items-center gap-2 font-medium">
                                    <ServerIcon className="h-4 w-4"/>
                                    {t('sysops.monitoring.service_runtime')}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <InfoCell label={t('sysops.monitoring.cards.service.metrics.uptime')} value={formatDuration(overview.service.uptimeSeconds)}/>
                                    <InfoCell label={t('sysops.monitoring.version')} value={overview.service.version}/>
                                    <InfoCell label={t('sysops.monitoring.goroutines')} value={overview.service.goroutines}/>
                                    <InfoCell label={t('sysops.monitoring.runtime_memory')} value={formatBytes(overview.service.allocBytes)}/>
                                </div>
                            </div>
                        </Col>
                        <Col xs={24} lg={8}>
                            <div className="h-full rounded-lg border border-gray-100 p-4 dark:border-gray-800">
                                <div className="mb-4 flex items-center gap-2 font-medium">
                                    <TerminalIcon className="h-4 w-4"/>
                                    {t('sysops.monitoring.access_runtime')}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <InfoCell label={t('sysops.monitoring.cards.session.metrics.active')} value={overview.sessions.online}/>
                                    <InfoCell label={t('sysops.monitoring.cards.session.metrics.recording')} value={overview.sessions.recording}/>
                                    <InfoCell label={t('menus.gateway.label')} value={`${overview.resources.gatewayActive}/${overview.resources.gatewayTotal}`}/>
                                    <InfoCell label={t('dashboard.login_failed_times')} value={overview.resources.loginFailed}/>
                                </div>
                            </div>
                        </Col>
                        <Col xs={24} lg={8}>
                            <div className="h-full rounded-lg border border-gray-100 p-4 dark:border-gray-800">
                                <div className="mb-4 flex items-center gap-2 font-medium">
                                    <DatabaseIcon className="h-4 w-4"/>
                                    {t('sysops.monitoring.database_runtime')}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <InfoCell label={t('sysops.monitoring.cards.database.metrics.connections')} value={overview.database.openConnections}/>
                                    <InfoCell label={t('sysops.monitoring.database_in_use')} value={overview.database.inUse}/>
                                    <InfoCell label={t('sysops.monitoring.database_idle')} value={overview.database.idle}/>
                                    <InfoCell label={t('sysops.monitoring.database_wait')} value={overview.database.waitCount}/>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} lg={10}>
                            <div className="h-full rounded-lg border border-gray-100 p-4 dark:border-gray-800">
                                <div className="mb-4 flex items-center gap-2 font-medium">
                                    <ShieldAlertIcon className="h-4 w-4"/>
                                    {t('sysops.monitoring.alert_title')}
                                </div>
                                {alertStates.length > 0 ? (
                                    <div className="space-y-2">
                                        {alertStates.map(renderAlertState)}
                                    </div>
                                ) : (
                                    <Alert showIcon type="success" title={t('sysops.monitoring.no_alerts')}/>
                                )}
                            </div>
                        </Col>
                        <Col xs={24} lg={7}>
                            <div className="h-full rounded-lg border border-gray-100 p-4 dark:border-gray-800">
                                <div className="mb-4 flex items-center gap-2 font-medium">
                                    <ActivityIcon className="h-4 w-4"/>
                                    {t('sysops.monitoring.health_title')}
                                </div>
                                <div className="space-y-2">
                                    {visibleHealth.map(renderHealth)}
                                </div>
                            </div>
                        </Col>
                        <Col xs={24} lg={7}>
                            <div className="h-full rounded-lg border border-gray-100 p-4 dark:border-gray-800">
                                <div className="mb-4 flex items-center gap-2 font-medium">
                                    <RadioTowerIcon className="h-4 w-4"/>
                                    {t('sysops.monitoring.protocol_title')}
                                </div>
                                {protocols.length > 0 ? (
                                    <div className="space-y-3">
                                        {protocols.map(item => (
                                            <div key={item.protocol}>
                                                <div className="mb-1 flex items-center justify-between text-sm">
                                                    <span>{item.protocol}</span>
                                                    <span>{item.count}</span>
                                                </div>
                                                <Progress percent={overview.sessions.online ? percent(item.count * 100 / overview.sessions.online) : 0} showInfo={false} size="small"/>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('sysops.monitoring.no_online_protocols')}/>
                                )}
                            </div>
                        </Col>
                    </Row>
                </>
            )}
        </div>
    );
};

const InfoCell = ({label, value}: { label: string; value: ReactNode }) => (
    <div className="min-w-0 rounded bg-gray-50 px-3 py-2 dark:bg-gray-900">
        <div className="truncate text-xs text-gray-500">{label}</div>
        <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
);

export default SystemMonitorPage;
