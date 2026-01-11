import React from "react"
import {CartesianGrid, Line, LineChart, XAxis, YAxis,} from "recharts"
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import {Card,CardContent, CardHeader, CardTitle} from "@/components/ui/card";

interface PercentageChartProps {
    title: string
    data: any[]
}

const chartConfig = {
    visitors: {
        label: "Visitors",
    },
    tcp: {
        label: "TCP",
        color: "var(--chart-1)",
    },
    udp: {
        label: "UDP",
        color: "var(--chart-2)",
    }
} satisfies ChartConfig

export const ConnChart: React.FC<PercentageChartProps> = ({title,data,}) => {

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
                    <LineChart data={data}>

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
                            axisLine={false}
                            tickLine={false}
                            tickMargin={8}
                        />

                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    indicator="dot"
                                />
                            }
                        />


                        <Line
                            dataKey="tcp"
                            type="natural"
                            stroke="var(--color-tcp)"
                            strokeWidth={2}
                            dot={{
                                fill: "var(--color-tcp)",
                            }}
                        />

                        <Line
                            dataKey="udp"
                            type="natural"
                            stroke="var(--color-udp)"
                            strokeWidth={2}
                            dot={{
                                fill: "var(--color-udp)",
                            }}
                        />

                        <ChartLegend content={<ChartLegendContent/>}/>
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}