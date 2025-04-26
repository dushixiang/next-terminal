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

interface PercentageChartProps {
    title: string
    data: any[]
}

const chartConfig = {
    visitors: {
        label: "Visitors",
    },
    cpu: {
        label: "CPU",
        color: "hsl(var(--chart-1))",
    }
} satisfies ChartConfig

export const CpuChart: React.FC<PercentageChartProps> = ({title, data,}) => {
    const dataKey = 'cpu';
    const colorVar = "var(--color-cpu)";
    const gradientId = `fill-${dataKey}`

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
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colorVar} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={colorVar} stopOpacity={0.1}/>
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
                            domain={[0, 100]}
                            tickFormatter={(value) => `${value}%`}
                            axisLine={false}
                            tickLine={false}
                            tickMargin={8}
                        />

                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    indicator="dot"
                                    valueFormatter={(value) => `${(value as number).toFixed(2)}%`}
                                />
                            }
                        />

                        <Area
                            dataKey={dataKey}
                            type="natural"
                            fill={`url(#${gradientId})`}
                            stroke={colorVar}
                            stackId="a"
                        />

                        <ChartLegend content={<ChartLegendContent/>}/>
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}