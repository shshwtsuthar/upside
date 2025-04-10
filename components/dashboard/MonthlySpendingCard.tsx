// components/dashboard/MonthlySpendingCard.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/up-api";
import { TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

interface MonthlySpendingCardProps {
    spendingAmount: number | null;
    isLoading: boolean;
    error?: string | null;
}

export function MonthlySpendingCard({ spendingAmount, isLoading, error }: MonthlySpendingCardProps) {
    let content;

    if (isLoading) {
        // content = <div className="text-2xl font-bold animate-pulse">Calculating...</div>;
        content = <Skeleton className="h-8 w-3/4" />; // Use Skeleton
    } else if (error) {
        content = <div className="text-sm font-semibold text-destructive truncate" title={error}>Error</div>;
    } else if (spendingAmount !== null) {
        // Display the absolute value
        content = <div className="text-2xl font-bold">{formatCurrency(Math.abs(spendingAmount))}</div>;
    } else {
        content = <div className="text-sm text-muted-foreground">N/A</div>; // Fallback
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Spending This Month
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {content}
                <p className="text-xs text-muted-foreground">
                    Sum of outgoing transactions this month
                </p>
            </CardContent>
        </Card>
    );
}