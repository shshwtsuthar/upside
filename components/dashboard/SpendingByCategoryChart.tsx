// components/dashboard/SpendingByCategoryChart.tsx
"use client";

import * as React from "react";
import { Pie, PieChart, Sector, Cell } from "recharts"; // <-- Import Cell
import { PieSectorDataItem } from "recharts/types/polar/Pie";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { UpTransactionResource } from "@/lib/up-api-types";
import { formatCurrency } from "@/lib/up-api";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils"; // Import cn for potential conditional styling

interface SpendingByCategoryChartProps {
    transactions: UpTransactionResource[] | null;
    isLoading: boolean;
    error?: string | null;
}

interface ChartDataPoint {
    categoryId: string;
    spending: number; // Absolute value in base units (cents)
    // 'fill' is now handled by ChartConfig + Cells, not stored directly here
}

// Define the chart color variables (make sure these match globals.css)
const chartColorVars = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    // Add more if needed
];

export function SpendingByCategoryChart({ transactions, isLoading, error }: SpendingByCategoryChartProps) {
    const [activeIndex, setActiveIndex] = React.useState<number | undefined>(undefined);

    // Process transactions and generate chart config using useMemo
    const { chartData, chartConfig } = React.useMemo(() => {
        if (!transactions || transactions.length === 0) {
            return { chartData: [], chartConfig: {} };
        }

        const spendingByCategory: { [key: string]: number } = {};

        transactions.forEach((tx) => {
            const amount = tx.attributes.amount.valueInBaseUnits;
            if (amount < 0) {
                const categoryId = tx.relationships.category?.data?.id ?? "Uncategorized";
                spendingByCategory[categoryId] = (spendingByCategory[categoryId] || 0) + Math.abs(amount);
            }
        });

        // Convert to array and sort by spending (desc)
        const sortedData: ChartDataPoint[] = Object.entries(spendingByCategory)
            .map(([id, value]): ChartDataPoint => ({
                categoryId: id,
                spending: value,
            }))
            .sort((a, b) => b.spending - a.spending); // Sort descending

        // Create dynamic chart config based on sorted data, assigning colors
        const dynamicChartConfig: ChartConfig = {};
        sortedData.forEach((item, index) => {
            const colorVar = chartColorVars[index % chartColorVars.length];
            dynamicChartConfig[item.categoryId] = {
                label: item.categoryId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Basic formatting
                color: colorVar, // Assign the CSS variable reference
            };
        });

         // Log the generated config for debugging
         // console.log("Generated Chart Config:", dynamicChartConfig);
         // console.log("Generated Chart Data:", sortedData);

        return { chartData: sortedData, chartConfig: dynamicChartConfig };
    }, [transactions]);

    const totalSpending = React.useMemo(() => {
        return chartData.reduce((acc, curr) => acc + curr.spending, 0);
    }, [chartData]);


    // --- Rendering Logic ---

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="items-center pb-0">
                    <Skeleton className="h-6 w-3/5 mb-1" />
                    <Skeleton className="h-4 w-4/5" />
                </CardHeader>
                <CardContent className="flex items-center justify-center pb-8 min-h-[350px]">
                   <Skeleton className="h-[250px] w-[250px] rounded-full" />
                </CardContent>
            </Card>
        );
    }

     if (error) {
        // Simplified error display
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Spending by Category</CardTitle>
                     <CardDescription className="text-destructive">Could not load spending data.</CardDescription>
                </CardHeader>
                 <CardContent className="flex flex-col items-center justify-center min-h-[350px] text-center text-muted-foreground">
                     <TrendingDown className="h-10 w-10 mb-2 text-destructive" />
                     <p className="text-sm">{error}</p>
                 </CardContent>
            </Card>
        );
    }

    if (chartData.length === 0) {
       // Simplified empty state
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Spending by Category</CardTitle>
                    <CardDescription>Distribution of spending this month.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center min-h-[350px] text-center text-muted-foreground">
                     <TrendingDown className="h-10 w-10 mb-2" />
                    <p className="text-sm">No spending data found for this period.</p>
                </CardContent>
            </Card>
        );
    }

    // Render the chart if data exists
    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Total spending this month: {formatCurrency(totalSpending)}</CardDescription>
            </CardHeader>
            {/* Use flex-grow to allow content to take space */}
            <CardContent className="flex-1 pb-4"> {/* Reduced bottom padding */}
                <ChartContainer
                    config={chartConfig} // Pass the generated config
                     // Ensure container allows chart to size correctly, maybe remove max-h
                    className="mx-auto aspect-square min-h-[250px]"
                >
                    <PieChart> {/* Removed accessibilityLayer for now to rule out interference */}
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent
                                hideLabel
                                nameKey="categoryId"
                                formatter={(value, name, item) => { // Use the full formatter signature
                                    // Lookup label from config, fallback to name (categoryId)
                                    const configLabel = chartConfig[name]?.label ?? name;
                                    return (<div className="flex flex-col">
                                              <span>{configLabel}</span>
                                              <span className="font-bold">{formatCurrency(Number(value))}</span>
                                            </div>);
                                }}
                                />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="spending"
                            nameKey="categoryId"
                            innerRadius={60}
                            outerRadius={100}
                            strokeWidth={2} // Reduced stroke width slightly
                            activeIndex={activeIndex}
                             // Use fill from Cell, this prop is not needed here
                            // fill="var(--color-spending)" <-- REMOVE or COMMENT OUT
                            activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
                                <Sector {...props} outerRadius={outerRadius + 5} stroke="hsl(var(--foreground))" /> // Highlight with foreground stroke
                            )}
                            onMouseEnter={(_, index) => setActiveIndex(index)} // Changed fromMouseOver
                            onMouseLeave={() => setActiveIndex(undefined)}
                        >
                           {/* *** ADD THIS PART *** */}
                           {/* Map data to Cell components for individual colors */}
                           {chartData.map((entry) => (
                               <Cell key={`cell-${entry.categoryId}`}
                                     fill={chartConfig[entry.categoryId]?.color || "hsl(var(--muted))"} // Use color from config, fallback grey
                                     className={cn(
                                         // Add focus/hover styles if needed, directly or via config
                                         "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                         // Example hover (might need more complex state management)
                                         // { "opacity-80": activeIndex !== index && activeIndex !== undefined }
                                     )}
                                />
                           ))}
                        </Pie>
                        {/* Legend - Try default positioning first */}
                        <ChartLegend
                            content={<ChartLegendContent nameKey="categoryId" className="text-xs [&>div]:flex [&>div]:flex-wrap [&>div]:gap-x-3 [&>div]:gap-y-1" />} // Use categoryId and smaller text + wrap
                            // Remove className="-translate-y-10" initially
                            wrapperStyle={{ marginTop: '20px' }} // Add margin below chart
                         />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}