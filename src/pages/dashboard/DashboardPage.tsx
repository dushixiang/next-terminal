import {useEffect, useState} from 'react';
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import dashboardApi from "@/api/dashboard-api";
import sessionApi from "@/api/session-api";
import CountUp from "react-countup";
import {GlobeIcon, RouteIcon, ServerIcon, ShieldBanIcon, TerminalIcon, UsersIcon} from "lucide-react";
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent
} from "@/components/ui/chart";
import {Area, AreaChart, CartesianGrid, Pie, PieChart, XAxis} from "recharts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import dayjs from "dayjs";
import {useMobile} from "@/hook/use-mobile";
import {cn} from "@/lib/utils";

const chartConfig2 = {
    rdp: {
        label: "RDP",
        color: "var(--chart-1)",
    },
    vnc: {
        label: "VNC",
        color: "var(--chart-2)",
    },
    ssh: {
        label: "SSH",
        color: "var(--chart-3)",
    },
    telnet: {
        label: "TELNET",
        color: "var(--chart-4)",
    },
    http: {
        label: "HTTP",
        color: "var(--chart-5)",
    },
} satisfies ChartConfig

const DashboardPage = () => {

    let {t} = useTranslation();
    const { isMobile } = useMobile();

    let [pieData, setPidData] = useState([]);

    let timeCounterQuery = useQuery({
        queryKey: ['timeCounter'],
        queryFn: dashboardApi.getTimeCounter,
    });

    let dateCounterQuery = useQuery({
        queryKey: ['dateCounter'],
        queryFn: dashboardApi.getDateCounterV2,
    });

    let assetTypesQuery = useQuery({
        queryKey: ['assetTypes'],
        queryFn: dashboardApi.getAssetTypes,
    });

    const chartConfig = {
        login: {
            label: t('dashboard.login_times'),
            color: "var(--chart-1)",
        },
        user: {
            label: t('dashboard.active_users'),
            color: "var(--chart-2)",
        },
        asset: {
            label: t('dashboard.active_assets'),
            color: "var(--chart-3)",
        },
    } satisfies ChartConfig

    useEffect(() => {
        if (assetTypesQuery.data) {
            let data = assetTypesQuery.data.map(item => {
                return {
                    name: item.type.toLowerCase(),
                    value: item.value,
                    fill: `var(--color-${item.type.toLowerCase()})`,
                }
            });
            setPidData(data)
        }
    }, [assetTypesQuery.data]);

    let sessionQuery = useQuery({
        queryKey: ['sessions'],
        queryFn: () => {
            let queryParams = {
                pageIndex: 1,
                pageSize: 5,
                // sort: JSON.stringify(sort),
                status: 'disconnected',
            }
            return sessionApi.getPaging(queryParams);
        }
    });

    const counters = [
        {
            title: t('dashboard.login_failed_times'),
            value: timeCounterQuery.data?.loginFailedTimes,
            icon: <ShieldBanIcon className={'h-4 w-4'}/>,
        },
        {
            title: t('dashboard.user_online_count'),
            value: timeCounterQuery.data?.userOnlineCount,
            icon: <UsersIcon className={'h-4 w-4'}/>,
        },
        {
            title: t('menus.log_audit.submenus.online_session'),
            value: timeCounterQuery.data?.sessionOnlineCount,
            icon: <TerminalIcon className={'h-4 w-4'}/>,
        },
        {
            title: t('dashboard.gateway_active_count'),
            value: timeCounterQuery.data?.gatewayActiveCount,
            icon: <RouteIcon className={'h-4 w-4'}/>,
        },
        {
            title: t('dashboard.asset_active_count'),
            value: timeCounterQuery.data?.assetActiveCount,
            icon: <ServerIcon className={'h-4 w-4'}/>,
        },
        {
            title: t('menus.resource.submenus.website'),
            value: timeCounterQuery.data?.websiteTotalCount,
            icon: <GlobeIcon className={'h-4 w-4'}/>,
        },
    ];

    return (
        <div className={cn('px-4 space-y-4', isMobile && 'px-2')}>
            <div className={'font-medium'}>{t('menus.dashboard.label')}</div>
            <div className={cn(
                'grid gap-4',
                isMobile ? 'grid-cols-2' : 'grid-cols-6'
            )}>
                {counters.map(item => {
                    return <div className={cn(
                        'rounded-xl border',
                        isMobile ? 'p-3' : 'p-4'
                    )} key={item.title}>
                        <div className={'flex items-center justify-between'}>
                            <div className={cn(
                                'font-medium',
                                isMobile && 'text-sm line-clamp-2'
                            )}>
                                {item.title}
                            </div>
                            {item.icon}
                        </div>
                        <div className={cn(
                            'mt-2 font-bold',
                            isMobile ? 'text-base' : 'text-lg'
                        )}>
                            <CountUp delay={2} end={item.value}/>
                        </div>
                    </div>
                })}
            </div>

            <div className={'font-medium'}>{t('dashboard.date_counter')}</div>
            <div className={cn('rounded-xl border', isMobile ? 'p-2' : 'p-4')}>
                <ChartContainer
                    config={chartConfig}
                    className={cn(
                        "aspect-auto w-full",
                        isMobile ? "h-[200px]" : "h-[250px]"
                    )}
                >
                    <AreaChart data={dateCounterQuery.data}>
                        <defs>
                            <linearGradient id="fillLogin" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="var(--color-login)"
                                    stopOpacity={0.8}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="var(--color-login)"
                                    stopOpacity={0.1}
                                />
                            </linearGradient>
                            <linearGradient id="fillUser" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="var(--color-user)"
                                    stopOpacity={0.8}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="var(--color-user)"
                                    stopOpacity={0.1}
                                />
                            </linearGradient>
                            <linearGradient id="fillAsset" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="var(--color-asset)"
                                    stopOpacity={0.8}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="var(--color-asset)"
                                    stopOpacity={0.1}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false}/>
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value) => {
                                const date = new Date(value)
                                return date.toLocaleDateString()
                            }}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) => {
                                        return new Date(value).toLocaleDateString()
                                    }}
                                    indicator="dot"
                                />
                            }
                        />
                        <Area
                            dataKey="login"
                            type="natural"
                            fill="url(#fillLogin)"
                            stroke="var(--color-login)"
                            stackId="a"
                        />
                        <Area
                            dataKey="user"
                            type="natural"
                            fill="url(#fillUser)"
                            stroke="var(--color-user)"
                            stackId="b"
                        />
                        <Area
                            dataKey="asset"
                            type="natural"
                            fill="url(#fillAsset)"
                            stroke="var(--color-asset)"
                            stackId="c"
                        />
                        <ChartLegend content={<ChartLegendContent/>}/>
                    </AreaChart>
                </ChartContainer>
            </div>

            <div className={cn(
                'grid gap-4',
                isMobile ? 'grid-cols-1' : 'grid-cols-3'
            )}>
                <div className={cn(
                    'space-y-4',
                    !isMobile && 'col-span-2'
                )}>
                    <div className={'font-medium'}>{t('dashboard.latest_session')}</div>
                    <div className={cn('border rounded-xl', isMobile ? 'p-2' : 'p-4')}>
                        <div className="overflow-x-auto">
                            <Table className={cn(isMobile ? 'min-h-[200px]' : 'min-h-[250px]')}>
                                <TableHeader>
                                    <TableRow>
                                        {!isMobile && <TableHead className="w-[100px] text-center">{t('audit.client_ip')}</TableHead>}
                                        <TableHead className={'text-center'}>{t('menus.identity.submenus.user')}</TableHead>
                                        <TableHead className={'text-center'}>{t('assets.protocol')}</TableHead>
                                        <TableHead className={'text-center'}>{t('menus.resource.submenus.asset')}</TableHead>
                                        {!isMobile && <TableHead className={'text-center'}>{t('audit.connected_at')}</TableHead>}
                                        {!isMobile && <TableHead className={'text-center'}>{t('audit.connection_duration')}</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessionQuery.data?.items.map((session) => (
                                        <TableRow key={session.id}>
                                            {!isMobile && <TableCell className={'text-center p-2.5'}>{session.clientIp}</TableCell>}
                                            <TableCell className={cn('text-center', isMobile ? 'p-1.5 text-xs' : 'p-2.5')}>{session.userAccount}</TableCell>
                                            <TableCell className={cn('text-center', isMobile ? 'p-1.5 text-xs' : 'p-2.5')}>{session.protocol}</TableCell>
                                            <TableCell className={cn('text-center', isMobile ? 'p-1.5 text-xs' : 'p-2.5')}>
                                                {isMobile ? 
                                                    <div className="line-clamp-2">
                                                        {session.username}@{session.ip}
                                                    </div> :
                                                    `${session.username}@${session.ip}:${session.port}`
                                                }
                                            </TableCell>
                                            {!isMobile && (
                                                <>
                                                    <TableCell className={'text-center p-2.5'}>
                                                        {dayjs(session.connectedAt).format('YYYY-MM-DD HH:mm:ss')}
                                                    </TableCell>
                                                    <TableCell className={'text-center p-2.5'}>{session.connectionDuration}</TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
                <div className={'space-y-4'}>
                    <div className={'font-medium'}>{t('dashboard.asset_type')}</div>
                    <div className={cn('rounded-xl border', isMobile ? 'p-2' : 'p-4')}>
                        <ChartContainer
                            config={chartConfig2}
                            className={cn(
                                "mx-auto aspect-square",
                                isMobile ? "max-h-[200px]" : "max-h-[250px]"
                            )}
                        >
                            <PieChart>
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent hideLabel/>}
                                />
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={isMobile ? 30 : 50}
                                >

                                </Pie>
                                <ChartLegend
                                    content={<ChartLegendContent nameKey={'name'}/>}
                                    // className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                                />
                            </PieChart>
                        </ChartContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;