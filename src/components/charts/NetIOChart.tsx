import React from "react"
import {Area, AreaChart, CartesianGrid, XAxis, YAxis,} from "recharts"
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {renderSize} from "@/src/utils/utils";

interface PercentageChartProps {
    title: string
    data: any[]
}

const chartConfig = {
    visitors: {
        label: "Visitors",
    },
    rx: {
        label: "RX",
        color: "hsl(var(--chart-1))",
    },
    tx: {
        label: "TX",
        color: "hsl(var(--chart-2))",
    }
} satisfies ChartConfig

export const NetIOChart: React.FC<PercentageChartProps> = ({title, data,}) => {

    return (
        <Card>
            <CardTitle>
                <CardHeader>
                    <CardTitle><div className={'text-base'}>{title}</div></CardTitle>
                </CardHeader>
            </CardTitle>
            <CardContent>
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[250px] w-full"
                >
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={`fill-tx`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={`var(--color-tx)`} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={`var(--color-tx)`} stopOpacity={0.1}/>
                            </linearGradient>

                            <linearGradient id={`fill-rx`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={`var(--color-rx)`} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={`var(--color-rx)`} stopOpacity={0.1}/>
                            </linearGradient>
                        </defs>

                        <CartesianGrid vertical={false}/>

                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                        />

                        <YAxis
                            tickFormatter={(value) => {
                                return renderSize(value);
                            }}
                            axisLine={false}
                            tickLine={false}
                            tickMargin={8}
                        />

                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    indicator="dot"
                                    valueFormatter={(value) => renderSize(value as number)}
                                />
                            }
                        />

                        <Area
                            dataKey={`tx`}
                            type="natural"
                            fill={`url(#fill-tx)`}
                            stroke={`var(--color-tx)`}
                            stackId="a"
                            animateNewValues={false}
                        />

                        <Area
                            dataKey={`rx`}
                            type="natural"
                            fill={`url(#fill-rx)`}
                            stroke={`var(--color-rx)`}
                            stackId="a"
                            animateNewValues={false}
                        />

                        <ChartLegend content={<ChartLegendContent/>}/>
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}