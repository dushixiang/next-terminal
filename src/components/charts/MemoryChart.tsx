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
import {renderSize} from "@/src/utils/utils";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

interface PercentageChartProps {
    title: string
    data: any[]
}

const chartConfig = {
    visitors: {
        label: "Visitors",
    },
    free: {
        label: "Free",
        color: "hsl(var(--chart-2))",
    },
    used: {
        label: "Used",
        color: "hsl(var(--chart-1))",
    }
} satisfies ChartConfig

export const MemoryChart: React.FC<PercentageChartProps> = ({title,data,}) => {

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
                            // domain={[0, 100]}
                            tickFormatter={(value) => {
                                return renderSize(value);
                            }}
                            axisLine={false}
                            tickLine={false}
                            tickMargin={8}
                        />

                        <ChartTooltip
                            cursor={true}
                            content={
                                <ChartTooltipContent
                                    // labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                                    indicator="dot"
                                    valueFormatter={(value) => renderSize(value as number)}
                                />
                            }
                        />

                        <Area
                            dataKey={'used'}
                            type="natural"
                            fill={`var(--color-used)`}
                            stroke={`var(--color-used)`}
                            stackId="a"
                        />
                        <Area
                            dataKey={'free'}
                            type="natural"
                            fill={`var(--color-free)`}
                            stroke={`var(--color-free)`}
                            stackId="a"
                        />
                        <ChartLegend content={<ChartLegendContent/>}/>
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}