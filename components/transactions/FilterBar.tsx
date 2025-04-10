// components/transactions/FilterBar.tsx
"use client";

import React from 'react';
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Calendar as CalendarIcon, FilterX } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

// Interface only includes props that are actually used now
interface FilterBarProps {
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
    onResetFilters: () => void;
}

export function FilterBar({
    dateRange,
    setDateRange,
    onResetFilters,
}: FilterBarProps) { // Only destructure used props

    return (
        <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-6 p-4 border rounded-lg bg-card">
            {/* Date Range Picker */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>

            {/* Account Selector Removed */}
            {/* Transaction Type Toggle Removed */}

            {/* Reset Button */}
            <Button variant="ghost" size="sm" onClick={onResetFilters} className="ml-auto">
                <FilterX className="mr-2 h-4 w-4" /> Reset
            </Button>
        </div>
    );
}