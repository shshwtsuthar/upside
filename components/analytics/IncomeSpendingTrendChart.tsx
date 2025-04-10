// components/analytics/IncomeSpendingTrendChart.tsx
"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/up-api";
import { BarChartHorizontal } from "lucide-react"; // Use icon for empty state

// Data structure expected by this component
export interface ProcessedTrendDataPoint {
    month: string; // Short month name (e.g., "Jan", "Feb")
    income: number; // Total income in base units (cents)
    spending: number; // Total *absolute* spending in base units (cents)
}

interface IncomeSpendingTrendChartProps {
    chartData: ProcessedTrendDataPoint[];
    chartConfig: ChartConfig;
}

// Y-axis tick formatter
const formatAxisAmount = (value: number): string => {
    const absValue = Math.abs(value / 100);
    if (absValue >= 1000) {
        return `$${(absValue / 1000).toFixed(absValue % 1000 !== 0 ? 1 : 0)}k`;
    }
    return `$${absValue.toFixed(0)}`;
};

export function IncomeSpendingTrendChart({
    chartData,
    chartConfig
}: IncomeSpendingTrendChartProps) {

    if (!chartData || chartData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[250px] text-center text-muted-foreground">
                 <BarChartHorizontal className="h-10 w-10 mb-2" />
                 <p className="text-sm">No income/spending data found.</p>
             </div>
        );
    }

    return (
        // Explicit height is important for BarChart
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart
                accessibilityLayer
                data={chartData}
                margin={{ top: 5, right: 5, left: -15, bottom: 5 }} // Adjust margins
                barGap={4}
            >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={5}
                    width={65} // Allow ample space for formatted labels
                    tickFormatter={(value) => formatAxisAmount(value)}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent
                                indicator="dot"
                                formatter={(value, name) => (
                                    `${chartConfig[name as keyof typeof chartConfig]?.label ?? name}: ${formatCurrency(Number(value))}`
                                )}
                             />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                    dataKey="income"
                    fill="var(--color-income)" // Defined in chartConfig passed as prop
                    radius={4}
                 />
                <Bar
                    dataKey="spending"
                    fill="var(--color-spending)" // Defined in chartConfig passed as prop
                    radius={4}
                 />
            </BarChart>
        </ChartContainer>
    );
}