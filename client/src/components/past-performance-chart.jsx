"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";

export default function PastPerformanceChart({ rows }) {
    const data = (rows || [])
        .map((r, idx) => ({
            x: idx + 1,
            rank: typeof r.rank === "number" ? r.rank : null,
            room: r.roomName,
            contest: r.contestTitle,
            participants: r.participants,
        }))
        .filter((d) => typeof d.rank === "number");

    if (!data.length) {
        return (
            <div className="h-[350px] w-full flex items-center justify-center">
                <p className="text-muted-foreground">No rank data available</p>
            </div>
        );
    }

    const chartConfig = {
        rank: {
            label: "Rank",
            color: "hsl(var(--chart-1))",
        },
    };

    return (
        <div className="h-[350px] w-full">
            <Card className="h-full">
                <CardContent className="h-full p-2 sm:p-4">
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <LineChart
                            data={data}
                            margin={{
                                top: 12,
                                right: 12,
                                left: 12,
                                bottom: 12,
                            }}
                        >
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis
                                dataKey="x"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={24}
                                allowDecimals={false}
                                tickFormatter={(v) => `#${v}`}
                            />
                            <YAxis
                                type="number"
                                allowDecimals={false}
                                reversed
                                tickLine={false}
                                axisLine={false}
                            />
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        nameKey="rank"
                                        labelFormatter={(value, payload) => {
                                            const p = Array.isArray(payload) && payload[0]?.payload;
                                            const contest = p?.contest ? ` • ${p.contest}` : "";
                                            return `Contest #${value}${contest}`;
                                        }}
                                    />
                                }
                            />
                            <Line
                                dataKey="rank"
                                type="monotone"
                                stroke="var(--color-rank)"
                                strokeWidth={2}
                                dot={{ r: 3, strokeWidth: 1.5, fill: "var(--color-rank)", stroke: "var(--color-rank)" }}
                                activeDot={{ r: 5, fill: "var(--color-rank)", stroke: "var(--color-rank)" }}
                            />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}
