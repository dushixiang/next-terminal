import React, {useEffect, useState} from 'react';
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import dashboardApi from "@/src/api/dashboard-api";
import sessionApi from "@/src/api/session-api";
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
import {translateI18nToESLocale, useLang} from "@/src/hook/use-lang";

const chartConfig2 = {
    rdp: {
        label: "RDP",
        color: "hsl(var(--chart-1))",
    },
    vnc: {
        label: "VNC",
        color: "hsl(var(--chart-2))",
    },
    ssh: {
        label: "SSH",
        color: "hsl(var(--chart-3))",
    },
    telnet: {
        label: "TELNET",
        color: "hsl(var(--chart-4))",
    },
    http: {
        label: "HTTP",
        color: "hsl(var(--chart-5))",
    },
} satisfies ChartConfig

const DashboardPage = () => {

    let {t} = useTranslation();
    let [lang] = useLang();

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
            color: "hsl(var(--chart-1))",
        },
        user: {
            label: t('dashboard.active_users'),
            color: "hsl(var(--chart-2))",
        },
        asset: {
            label: t('dashboard.active_assets'),
            color: "hsl(var(--chart-3))",
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
            title: t('dashboard.session_online_count'),
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
            title: t('dashboard.website_count'),
            value: timeCounterQuery.data?.websiteTotalCount,
            icon: <GlobeIcon className={'h-4 w-4'}/>,
        },
    ];

    return (
        <div className={'px-4 space-y-4'}>
            <div className={'font-medium'}>{t('dashboard.name')}</div>
            <div className={'grid grid-cols-6 gap-4'}>
                {counters.map(item => {
                    return <div className={'rounded-xl p-4 border'} key={item.title}>
                        <div className={'flex items-center justify-between'}>
                            <div className={'font-medium'}>
                                {item.title}
                            </div>
                            {item.icon}
                        </div>
                        <div className={'mt-2 text-lg font-bold'}>
                            <CountUp delay={2} end={item.value}/>
                        </div>
                    </div>
                })}
            </div>

            <div className={'font-medium'}>{t('dashboard.date_counter')}</div>
            <div className={'rounded-xl p-4 border'}>
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[250px] w-full"
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
                                return date.toLocaleDateString(translateI18nToESLocale(lang), {
                                    month: "short",
                                    day: "numeric",
                                })
                            }}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) => {
                                        return new Date(value).toLocaleDateString(translateI18nToESLocale(lang), {
                                            month: "short",
                                            day: "numeric",
                                        })
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

            <div className={'grid grid-cols-3 gap-4'}>
                <div className={'col-span-2 space-y-4'}>
                    <div className={'font-medium'}>{t('dashboard.latest_session')}</div>
                    <div className={'p-4 border rounded-xl'}>
                        <Table
                            className={'min-h-[250px]'}
                        >
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px] text-center">{t('audit.client_ip')}</TableHead>
                                    <TableHead className={'text-center'}>{t('audit.user')}</TableHead>
                                    <TableHead className={'text-center'}>{t('audit.protocol')}</TableHead>
                                    <TableHead className={'text-center'}>{t('audit.asset')}</TableHead>
                                    <TableHead className={'text-center'}>{t('audit.connected_at')}</TableHead>
                                    <TableHead className={'text-center'}>{t('audit.connection_duration')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessionQuery.data?.items.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell className={'text-center p-2.5'}>{session.clientIp}</TableCell>
                                        <TableCell className={'text-center p-2.5'}>{session.userAccount}</TableCell>
                                        <TableCell className={'text-center p-2.5'}>{session.protocol}</TableCell>
                                        <TableCell className={'text-center p-2.5'}>
                                            {`${session.username}@${session.ip}:${session.port}`}
                                        </TableCell>
                                        <TableCell className={'text-center p-2.5'}>
                                            {dayjs(session.connectedAt).format('YYYY-MM-DD HH:mm:ss')}
                                        </TableCell>
                                        <TableCell
                                            className={'text-center p-2.5'}>{session.connectionDuration}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                <div className={'space-y-4'}>
                    <div className={'font-medium'}>{t('dashboard.asset_type')}</div>
                    <div className={'p-4 rounded-xl border'}>
                        <ChartContainer
                            config={chartConfig2}
                            className="mx-auto aspect-square max-h-[250px]"
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
                                    innerRadius={50}
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