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
    read: {
        label: "Read",
        color: "hsl(var(--chart-1))",
    },
    write: {
        label: "Write",
        color: "hsl(var(--chart-2))",
    }
} satisfies ChartConfig

export const DiskIOChart: React.FC<PercentageChartProps> = ({title, data,}) => {

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
                            <linearGradient id={`fill-write`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={`var(--color-write)`} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={`var(--color-write)`} stopOpacity={0.1}/>
                            </linearGradient>

                            <linearGradient id={`fill-read`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={`var(--color-read)`} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={`var(--color-read)`} stopOpacity={0.1}/>
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
                            dataKey={`write`}
                            type="natural"
                            fill={`url(#fill-write)`}
                            stroke={`var(--color-write)`}
                            stackId="a"
                        />

                        <Area
                            dataKey={`read`}
                            type="natural"
                            fill={`url(#fill-read)`}
                            stroke={`var(--color-read)`}
                            stackId="a"
                        />

                        <ChartLegend content={<ChartLegendContent/>}/>
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}