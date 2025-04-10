// components/analytics/SpendingCategoryChart.tsx
"use client";

import * as React from "react";
import { Pie, PieChart, Sector, Cell, Label } from "recharts"; // Added Label for center text
import { PieSectorDataItem } from "recharts/types/polar/Pie";

import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/up-api";
import { cn } from "@/lib/utils";
import { TrendingDown } from "lucide-react"; // For empty state

// Expect data processed by the server component
export interface ProcessedCategoryData {
    categoryId: string; // e.g., "groceries"
    categoryName: string; // e.g., "Groceries"
    spending: number; // Absolute value in cents
    // Color is defined in chartConfig, not needed in data itself
}

interface SpendingCategoryChartProps {
    chartData: ProcessedCategoryData[];
    chartConfig: ChartConfig;
    // totalSpending is NOT needed as a prop if we calculate it here for the label
}

export function SpendingCategoryChart({
    chartData,
    chartConfig,
}: SpendingCategoryChartProps) {
    const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);

    // Calculate total spending internally for the label, using useMemo
    const totalSpending = React.useMemo(() => {
        return chartData.reduce((acc, curr) => acc + curr.spending, 0);
    }, [chartData]);

    if (!chartData || chartData.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center min-h-[250px] text-center text-muted-foreground">
                 <TrendingDown className="h-10 w-10 mb-2" />
                 <p className="text-sm">No spending data found.</p>
             </div>
         );
    }

    return (
        <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square min-h-[250px] max-h-[400px]" // Maintain sizing
        >
            <PieChart>
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent
                        hideLabel // Don't show a generic label like "spending"
                        formatter={(value, name, props) => {
                            // 'name' here will be the value from nameKey ("categoryName")
                            // 'value' will be the value from dataKey ("spending")
                            return (
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-medium text-foreground">{props.payload?.payload?.categoryName ?? name}</span>
                                    <span className="text-muted-foreground">{formatCurrency(Number(value))}</span>
                                </div>
                             );
                        }}
                        />}
                />
                <Pie
                    data={chartData}
                    dataKey="spending"
                    nameKey="categoryName" // Use the readable name for tooltips/legends
                    innerRadius={60}
                    outerRadius={100}
                    strokeWidth={2}
                    activeIndex={activeIndex}
                    activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
                        <Sector {...props} outerRadius={outerRadius + 5} strokeWidth={1} stroke="hsl(var(--foreground) / 0.5)" />
                    )}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(undefined)}
                >
                    {/* Render Cells using chartConfig for fill */}
                    {chartData.map((entry) => (
                        <Cell
                            key={`cell-${entry.categoryId}`}
                            // Lookup color in config using categoryId, provide fallback
                            fill={chartConfig[entry.categoryId]?.color ?? "hsl(var(--muted))"}
                            className="focus:outline-none focus:ring-1 focus:ring-ring/50 focus:ring-offset-1"
                         />
                    ))}
                    {/* Center Label (similar to ShadCN example) */}
                     <Label
                         content={({ viewBox }) => {
                             if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                 return (
                                     <text
                                         x={viewBox.cx}
                                         y={viewBox.cy}
                                         textAnchor="middle"
                                         dominantBaseline="middle"
                                     >
                                         <tspan
                                             x={viewBox.cx}
                                             y={viewBox.cy}
                                             className="fill-foreground text-xl font-bold"
                                         >
                                             {formatCurrency(totalSpending)}
                                         </tspan>
                                         <tspan
                                             x={viewBox.cx}
                                             y={(viewBox.cy || 0) + 20} // Position below
                                             className="fill-muted-foreground text-xs"
                                         >
                                             Total Spent
                                         </tspan>
                                     </text>
                                 )
                             }
                         }}
                     />
                </Pie>
                <ChartLegend
                     content={<ChartLegendContent nameKey="categoryName" className="text-xs [&>div]:flex [&>div]:flex-wrap [&>div]:gap-x-3 [&>div]:gap-y-1" />}
                     wrapperStyle={{ marginTop: '20px' }} // Adjust spacing if needed
                 />
            </PieChart>
        </ChartContainer>
    );
}