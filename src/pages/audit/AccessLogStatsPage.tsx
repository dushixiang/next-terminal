import React, {useState} from 'react';
import {useTranslation} from "react-i18next";
import {useQuery} from "@tanstack/react-query";
import {Card, Select, Table} from "antd";
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent
} from "@/components/ui/chart";
import {Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis} from "recharts";
import accessLogApi, {RealtimeMetrics, TopPages, TopReferers, WebsiteStats} from "@/src/api/access-log-api";
import websiteApi from "@/src/api/website-api";
import {renderSize} from "@/src/utils/utils";
import {
    ActivityIcon,
    EyeIcon,
    GlobeIcon,
    NetworkIcon,
    TimerIcon,
    TrendingUpIcon,
    UsersIcon,
    ZapIcon
} from "lucide-react";
import dayjs from "dayjs";

const {Option} = Select;

// 数字格式化函数
const formatNumber = (num: number | undefined): string => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
};

const AccessLogStatsPage = () => {
    const {t} = useTranslation();

    // 时间周期选项
    const PERIOD_OPTIONS = [
        {value: 'today', label: t('audit.accessLog.stats.periods.today')},
        {value: 'yesterday', label: t('audit.accessLog.stats.periods.yesterday')},
        {value: '7days', label: t('audit.accessLog.stats.periods.7days')},
        {value: '30days', label: t('audit.accessLog.stats.periods.30days')},
    ];
    const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>(''); // 默认为空字符串，表示全部网站
    const [period, setPeriod] = useState('today');

    // 获取网站列表
    const websitesQuery = useQuery({
        queryKey: ['websites'],
        queryFn: () => websiteApi.getAll(),
    });

    // 获取网站统计数据
    const websiteStatsQuery = useQuery({
        queryKey: ['website-stats', selectedWebsiteId, period],
        queryFn: () => accessLogApi.getWebsiteStats(selectedWebsiteId, period),
        // 移除 enabled 条件，允许空字符串的情况
    });

    // 获取流量趋势
    const trafficTrendQuery = useQuery({
        queryKey: ['website-traffic-trend', selectedWebsiteId, period],
        queryFn: () => accessLogApi.getWebsiteTrafficTrend(selectedWebsiteId, period),
        // 移除 enabled 条件，允许空字符串的情况
    });

    // 获取小时统计
    const hourlyStatsQuery = useQuery({
        queryKey: ['website-hourly-stats', selectedWebsiteId, period],
        queryFn: () => accessLogApi.getWebsiteHourlyStats(selectedWebsiteId, period),
        // 移除 enabled 条件，允许空字符串的情况
    });

    // 获取状态码统计
    const statusCodeStatsQuery = useQuery({
        queryKey: ['website-status-code-stats', selectedWebsiteId, period],
        queryFn: () => accessLogApi.getWebsiteStatusCodeStats(selectedWebsiteId, period),
        // 移除 enabled 条件，允许空字符串的情况
    });

    // 获取热门页面
    const topPagesQuery = useQuery({
        queryKey: ['top-pages', selectedWebsiteId, period],
        queryFn: () => accessLogApi.getTopPages(selectedWebsiteId, period, 10),
        // 移除 enabled 条件，允许空字符串的情况
    });

    // 获取热门来源
    const topReferersQuery = useQuery({
        queryKey: ['top-referers', selectedWebsiteId, period],
        queryFn: () => accessLogApi.getTopReferers(selectedWebsiteId, period, 10),
        // 移除 enabled 条件，允许空字符串的情况
    });

    // 获取实时指标
    const realtimeMetricsQuery = useQuery({
        queryKey: ['realtime-metrics', selectedWebsiteId],
        queryFn: () => accessLogApi.getRealtimeMetrics(selectedWebsiteId),
        // 移除 enabled 条件，允许空字符串的情况
        refetchInterval: 30000, // 30秒刷新
    });

    const websites = websitesQuery.data || [];
    const websiteStats = websiteStatsQuery.data || {} as WebsiteStats;
    const trafficTrend = trafficTrendQuery.data || [];
    const hourlyStats = hourlyStatsQuery.data || [];
    const statusCodeStats = statusCodeStatsQuery.data || [];
    const topPages = topPagesQuery.data || [];
    const topReferers = topReferersQuery.data || [];
    const realtimeMetrics = realtimeMetricsQuery.data || {} as RealtimeMetrics;

    // 移除自动选择第一个网站的逻辑，默认显示全部网站统计

    // 图表配置
    const trafficTrendConfig = {
        pv: {
            label: t('audit.accessLog.stats.metrics.pv'),
            color: "hsl(var(--chart-1))",
        },
        uv: {
            label: t('audit.accessLog.stats.metrics.uv'),
            color: "hsl(var(--chart-2))",
        },
        traffic: {
            label: t('audit.accessLog.stats.metrics.traffic'),
            color: "hsl(var(--chart-3))",
        },
    } satisfies ChartConfig;

    const hourlyChartConfig = {
        count: {
            label: t('audit.accessLog.stats.tooltip.visitCount'),
            color: "hsl(var(--chart-1))",
        },
    } satisfies ChartConfig;

    const statusCodeChartConfig = {
        "2xx": {
            label: t('audit.accessLog.stats.statusCodes.success'),
            color: "hsl(217, 91%, 60%)", // 蓝色 - 系统主色调，成功状态
        },
        "3xx": {
            label: t('audit.accessLog.stats.statusCodes.redirect'),
            color: "hsl(262, 83%, 58%)", // 紫色 - 重定向
        },
        "4xx": {
            label: t('audit.accessLog.stats.statusCodes.clientError'),
            color: "hsl(32, 95%, 44%)", // 橙色 - 客户端错误
        },
        "5xx": {
            label: t('audit.accessLog.stats.statusCodes.serverError'),
            color: "hsl(0, 84%, 60%)", // 红色 - 服务器错误
        },
        "other": {
            label: t('audit.accessLog.stats.statusCodes.other') || 'Other',
            color: "hsl(215, 16%, 47%)", // 灰色 - 其他状态
        },
    } satisfies ChartConfig;

    // 处理状态码数据
    const statusCodeChartData = statusCodeStats.map((item) => {
        let category = "other";
        const code = item.statusCode;
        if (code >= 200 && code < 300) category = "2xx";
        else if (code >= 300 && code < 400) category = "3xx";
        else if (code >= 400 && code < 500) category = "4xx";
        else if (code >= 500) category = "5xx";

        return {
            category: category,
            name: `${code}`,
            label: `${code}`,
            value: item.count,
            fill: statusCodeChartConfig[category as keyof typeof statusCodeChartConfig].color,
        };
    });

    console.log(`statusCodeChartData`, statusCodeChartData)

    // 核心指标卡片数据
    const coreMetrics = [
        {
            title: t('audit.accessLog.stats.metrics.pv'),
            value: websiteStats.pv,
            icon: <EyeIcon className="h-4 w-4"/>,
            formatter: formatNumber,
        },
        {
            title: t('audit.accessLog.stats.metrics.uv'),
            value: websiteStats.uv,
            icon: <UsersIcon className="h-4 w-4"/>,
            formatter: formatNumber,
        },
        {
            title: t('audit.accessLog.stats.metrics.ip'),
            value: websiteStats.ip,
            icon: <NetworkIcon className="h-4 w-4"/>,
            formatter: formatNumber,
        },
        {
            title: t('audit.accessLog.stats.metrics.traffic'),
            value: websiteStats.traffic,
            icon: <TrendingUpIcon className="h-4 w-4"/>,
            formatter: renderSize,
        },
        {
            title: t('audit.accessLog.stats.metrics.requests'),
            value: websiteStats.requests,
            icon: <GlobeIcon className="h-4 w-4"/>,
            formatter: formatNumber,
        },
        {
            title: t('audit.accessLog.stats.metrics.avgResponseTime'),
            value: websiteStats.avgResponseTime,
            icon: <TimerIcon className="h-4 w-4"/>,
            formatter: (val: number) => `${val?.toFixed(2) || 0}ms`,
        },
    ];

    // 实时指标卡片数据
    const realtimeMetricsCards = [
        {
            title: t('audit.accessLog.stats.realtime.currentOnline'),
            value: realtimeMetrics.currentOnline,
            icon: <ActivityIcon className="h-4 w-4"/>,
            formatter: formatNumber,
        },
        {
            title: t('audit.accessLog.stats.realtime.requestsPerSecond'),
            value: realtimeMetrics.requestsPerSecond,
            icon: <ZapIcon className="h-4 w-4"/>,
            formatter: (val: number) => `${val?.toFixed(1) || 0}/s`,
        },
        {
            title: t('audit.accessLog.stats.realtime.realtimeTraffic'),
            value: realtimeMetrics.trafficPerSecond,
            icon: <TrendingUpIcon className="h-4 w-4"/>,
            formatter: (val: number) => `${renderSize(val || 0)}/s`,
        },
        {
            title: t('audit.accessLog.stats.realtime.errorRate'),
            value: realtimeMetrics.errorRate,
            icon: <TimerIcon className="h-4 w-4"/>,
            formatter: (val: number) => `${(val * 100)?.toFixed(2) || 0}%`,
        },
    ];

    // 热门页面表格列
    const topPagesColumns = [
        {
            title: t('audit.accessLog.stats.table.pagePath'),
            dataIndex: 'uri',
            key: 'uri',
            render: (text: string) => <code className="text-sm">{text}</code>
        },
        {
            title: t('audit.accessLog.stats.table.pv'),
            dataIndex: 'pv',
            key: 'pv',
            sorter: (a: TopPages, b: TopPages) => a.pv - b.pv,
            render: (val: number) => formatNumber(val),
        },
        {
            title: t('audit.accessLog.stats.table.uv'),
            dataIndex: 'uv',
            key: 'uv',
            sorter: (a: TopPages, b: TopPages) => a.uv - b.uv,
            render: (val: number) => formatNumber(val),
        },
        {
            title: t('audit.accessLog.stats.table.avgResponseTime'),
            dataIndex: 'avgResponseTime',
            key: 'avgResponseTime',
            render: (val: number) => `${val?.toFixed(2) || 0}ms`,
        },
    ];

    // 热门来源表格列
    const topReferersColumns = [
        {
            title: t('audit.accessLog.stats.table.referer'),
            dataIndex: 'referer',
            key: 'referer',
            render: (text: string) => {
                if (!text || text === '-') return t('audit.accessLog.stats.table.directAccess');
                return <a href={text} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:underline">{text}</a>;
            }
        },
        {
            title: t('audit.accessLog.stats.table.visitCount'),
            dataIndex: 'count',
            key: 'count',
            sorter: (a: TopReferers, b: TopReferers) => a.count - b.count,
            render: (val: number) => formatNumber(val),
        },
    ];

    return (
        <div className="p-4 space-y-4 max-w-full overflow-hidden">
            {/* 页面标题和控制器 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-xl font-bold">{t('audit.accessLog.stats.title')}</h1>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Select
                        placeholder={t('audit.accessLog.stats.selectWebsite')}
                        value={selectedWebsiteId}
                        onChange={setSelectedWebsiteId}
                        style={{width: 200}}
                        loading={websitesQuery.isLoading}
                    >
                        <Option key="all" value="">
                            {t('audit.accessLog.stats.allWebsites')}
                        </Option>
                        {websites.map(website => (
                            <Option key={website.id} value={website.id}>
                                {website.name} ({website.domain})
                            </Option>
                        ))}
                    </Select>
                    <Select
                        value={period}
                        onChange={setPeriod}
                        style={{width: 120}}
                    >
                        {PERIOD_OPTIONS.map(option => (
                            <Option key={option.value} value={option.value}>
                                {option.label}
                            </Option>
                        ))}
                    </Select>
                </div>
            </div>

            {/* 核心指标概览 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {coreMetrics.map((metric, index) => (
                    <Card key={index} className="p-4 min-w-0">
                        <div className="flex items-center justify-between">
                            <div className="font-medium text-sm truncate pr-2">{metric.title}</div>
                            {metric.icon}
                        </div>
                        <div className="mt-2 text-lg font-bold truncate">
                            {metric.formatter(metric.value || 0)}
                        </div>
                    </Card>
                ))}
            </div>

            {/* 实时指标 */}
            <Card>
                <div className="font-medium mb-4">{t('audit.accessLog.stats.realtime.title')}</div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {realtimeMetricsCards.map((metric, index) => (
                        <div key={index} className="text-center min-w-0">
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-1">
                                {metric.icon}
                                <span className="truncate">{metric.title}</span>
                            </div>
                            <div className="text-lg font-bold truncate">
                                {metric.formatter(metric.value || 0)}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* 流量趋势图表 */}
            <Card title={t('audit.accessLog.stats.charts.trafficTrend')} loading={trafficTrendQuery.isLoading}>
                <div className="rounded-xl p-4 border-0 w-full overflow-hidden">
                    <ChartContainer
                        config={trafficTrendConfig}
                        className="aspect-auto h-[300px] w-full min-w-0"
                    >
                        <AreaChart data={trafficTrend}>
                            <defs>
                                <linearGradient id="fillPv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-pv)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--color-pv)" stopOpacity={0.1}/>
                                </linearGradient>
                                <linearGradient id="fillUv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-uv)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--color-uv)" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                            <XAxis
                                dataKey="time"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value) => {
                                    return dayjs(value).format('MM-DD HH:mm')
                                }}
                            />
                            <YAxis tickLine={false} axisLine={false}/>
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(value) => dayjs(value).format('YYYY-MM-DD HH:mm')}
                                        indicator="dot"
                                    />
                                }
                            />
                            <Area
                                dataKey="pv"
                                type="natural"
                                fill="url(#fillPv)"
                                stroke="var(--color-pv)"
                                stackId="a"
                            />
                            <Area
                                dataKey="uv"
                                type="natural"
                                fill="url(#fillUv)"
                                stroke="var(--color-uv)"
                                stackId="b"
                            />
                            <ChartLegend content={<ChartLegendContent/>}/>
                        </AreaChart>
                    </ChartContainer>
                </div>
            </Card>

            {/* 小时分布和状态码分布 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title={t('audit.accessLog.stats.charts.hourlyDistribution')} loading={hourlyStatsQuery.isLoading}>
                    <div className="rounded-xl p-4 border-0 w-full overflow-hidden">
                        <ChartContainer
                            config={hourlyChartConfig}
                            className="aspect-auto h-[300px] w-full min-w-0"
                        >
                            <BarChart data={hourlyStats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis
                                    dataKey="hour"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tickFormatter={(value) => `${value}:00`}
                                />
                                <YAxis tickLine={false} axisLine={false}/>
                                <ChartTooltip
                                    cursor={false}
                                    content={
                                        <ChartTooltipContent
                                            labelFormatter={(value) => `${t('audit.accessLog.stats.tooltip.time')}: ${value}:00`}
                                            formatter={(value) => [value, t('audit.accessLog.stats.tooltip.visitCount')]}
                                            indicator="dot"
                                        />
                                    }
                                />
                                <Bar
                                    dataKey="count"
                                    fill="var(--color-count)"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ChartContainer>
                    </div>
                </Card>
                <Card title={t('audit.accessLog.stats.charts.statusCodeDistribution')}
                      loading={statusCodeStatsQuery.isLoading}>
                    <div className="rounded-xl p-4 border-0 w-full overflow-hidden">
                        <ChartContainer
                            config={statusCodeChartConfig}
                            className="mx-auto aspect-square max-h-[300px] min-w-0"
                        >
                            <PieChart>
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent
                                        labelFormatter={(value, payload) => `${t('audit.accessLog.stats.tooltip.statusCode')} ${payload[0]?.name}`}
                                        formatter={(value, name) => [value]}
                                    />}
                                />
                                <Pie
                                    data={statusCodeChartData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={60}
                                    outerRadius={100}
                                >
                                    {statusCodeChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill}/>
                                    ))}
                                </Pie>
                                <ChartLegend
                                    // content={<ChartLegendContent nameKey="name"/>}
                                    // className="flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                                />
                            </PieChart>
                        </ChartContainer>
                    </div>
                </Card>
            </div>

            {/* 热门页面和热门来源 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title={t('audit.accessLog.stats.charts.topPages')} loading={topPagesQuery.isLoading}>
                    <div className="overflow-x-auto">
                        <Table
                            dataSource={topPages}
                            columns={topPagesColumns}
                            pagination={false}
                            size="small"
                            rowKey="uri"
                            scroll={{x: 'max-content'}}
                        />
                    </div>
                </Card>
                <Card title={t('audit.accessLog.stats.charts.topReferers')} loading={topReferersQuery.isLoading}>
                    <div className="overflow-x-auto">
                        <Table
                            dataSource={topReferers}
                            columns={topReferersColumns}
                            pagination={false}
                            size="small"
                            rowKey="referer"
                            scroll={{x: 'max-content'}}
                        />
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AccessLogStatsPage; 