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
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

interface PercentageChartProps {
    title: string
    data: any[]
}

const chartConfig = {
    visitors: {
        label: "Visitors",
    },
    CLOSED: {
        label: "CLOSED",
        color: "var(--chart-1)",
    },
    CLOSE_WAIT: {
        label: "CLOSE_WAIT",
        color: "var(--chart-2)",
    },
    ESTABLISHED: {
        label: "ESTABLISHED",
        color: "var(--chart-3)",
    },
    LISTEN: {
        label: "LISTEN",
        color: "var(--chart-4)",
    },
    SYN_SENT: {
        label: "SYN_SENT",
        color: "var(--chart-5)",
    }
} satisfies ChartConfig

export const StateChart: React.FC<PercentageChartProps> = ({title, data,}) => {

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
                    <LineChart accessibilityLayer
                               data={data}
                    >

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
                            axisLine={false}
                            tickLine={false}
                            tickMargin={8}
                        />

                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    indicator="dot"
                                    // valueFormatter={(value) => `${(value as number).toFixed(2)}%`}
                                />
                            }
                        />

                        <Line
                            dataKey="CLOSED"
                            type="natural"
                            stroke="var(--color-CLOSED)"
                            strokeWidth={2}
                            dot={{
                                fill: "var(--color-CLOSED)",
                            }}
                            activeDot={{
                                r: 6,
                            }}
                        />

                        <Line
                            dataKey="CLOSE_WAIT"
                            type="natural"
                            stroke="var(--color-CLOSE_WAIT)"
                            strokeWidth={2}
                            dot={{
                                fill: "var(--color-CLOSE_WAIT)",
                            }}
                            activeDot={{
                                r: 6,
                            }}
                        />

                        <Line
                            dataKey="ESTABLISHED"
                            type="natural"
                            stroke="var(--color-ESTABLISHED)"
                            strokeWidth={2}
                            dot={{
                                fill: "var(--color-ESTABLISHED)",
                            }}
                            activeDot={{
                                r: 6,
                            }}
                        />

                        <Line
                            dataKey="LISTEN"
                            type="natural"
                            stroke="var(--color-LISTEN)"
                            strokeWidth={2}
                            dot={{
                                fill: "var(--color-LISTEN)",
                            }}
                            activeDot={{
                                r: 6,
                            }}
                        />

                        <Line
                            dataKey="SYN_SENT"
                            type="natural"
                            stroke="var(--color-SYN_SENT)"
                            strokeWidth={2}
                            dot={{
                                fill: "var(--color-SYN_SENT)",
                            }}
                            activeDot={{
                                r: 6,
                            }}
                        />

                        <ChartLegend content={<ChartLegendContent/>}/>
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}