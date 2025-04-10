// app/transactions/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DateRange } from 'react-day-picker';
import { UpTransactionResource, UpTransactionsResponse } from '@/lib/up-api-types'; // Removed UpAccountResource
import { TransactionsTable } from '@/components/dashboard/TransactionsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, PackageOpen } from 'lucide-react';
import { FilterBar } from '@/components/transactions/FilterBar';
import { subDays } from 'date-fns';

const PAGE_SIZE = 25;
// Removed TransactionType definition

// Helper to check if filters are active (only date range now)
const areFiltersActive = (filters: { dateRange?: DateRange }) => {
    // You might want a more sophisticated check, e.g., if it differs from the default range
    return !!filters.dateRange; // Simple check: if date range is set
};

export default function TransactionsPage() {
    // --- Data State ---
    const [transactions, setTransactions] = useState<UpTransactionResource[]>([]);

    // --- Filter State (Only Date Range) ---
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const end = new Date();
        const start = subDays(end, 30);
        return { from: start, to: end };
    });

    // --- Control State ---
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);

    // --- Refs ---
    const observerRef = useRef<HTMLDivElement>(null);
    const isFetching = useRef(false);
    const filterFetchId = useRef(0); // To handle potential race conditions on filter change

    // --- Fetch Transactions Function (Simplified) ---
    const fetchTransactions = useCallback(async (
        cursor: string | null,
        currentFilters: { dateRange?: DateRange }, // Only accepts dateRange
        fetchId: number
    ) => {
        if (isFetching.current && cursor) return;
        if (isFetching.current && filterFetchId.current === fetchId && cursor) {
            console.log("Fetch already in progress for this filter set & cursor, skipping.");
            return;
        }

        isFetching.current = true;
        filterFetchId.current = fetchId;

        const isInitialOrFilterFetch = !cursor;
        setError(null); // Clear error before fetch
        setIsLoading(true);

        if (isInitialOrFilterFetch) {
            setTransactions([]);
            setNextCursor(null);
            setHasMore(true);
            setInitialLoadComplete(false);
            console.log("Fetching NEW/FILTERED data (Date Range), resetting list...");
        } else {
            console.log("Fetching MORE data for existing list...");
        }

        try {
            let apiUrl = `/api/user/transactions`;
            const params = new URLSearchParams();

            if (cursor) {
                params.append('cursorType', 'after');
                params.append('cursorValue', cursor);
            }

            // Add Only Date Filters
            if (currentFilters.dateRange?.from) {
                params.append('since', currentFilters.dateRange.from.toISOString());
            }
            if (currentFilters.dateRange?.to) {
                params.append('until', currentFilters.dateRange.to.toISOString());
            }

            if (params.toString()) {
                apiUrl += `?${params.toString()}`;
            }

            console.log(`>>> Constructed Fetch URL for Our API: ${apiUrl}`);
            const response = await fetch(apiUrl);

            if (filterFetchId.current !== fetchId) {
                console.log(`Discarding stale fetch results (ID: ${fetchId})`);
                isFetching.current = false;
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to fetch transactions (HTTP ${response.status})`);
            }

            const data: UpTransactionsResponse = await response.json();
            setTransactions(prev => isInitialOrFilterFetch ? data.data : [...prev, ...data.data]);

            const nextLink = data.links.next;
            let newNextCursor: string | null = null;
            if (nextLink) {
                try {
                    const urlParams = new URL(nextLink).searchParams;
                    newNextCursor = urlParams.get('page[after]');
                } catch (e) { console.error("Failed to parse next link:", nextLink, e); }
            }
            setNextCursor(newNextCursor);
            setHasMore(!!newNextCursor);

        } catch (err: any) {
            console.error(`Error fetching transactions (ID: ${fetchId}):`, err);
            if (filterFetchId.current === fetchId) {
                setError(err.message || "An unexpected error occurred.");
                setHasMore(false);
                if (isInitialOrFilterFetch) setTransactions([]);
            }
        } finally {
            if (filterFetchId.current === fetchId) {
                setIsLoading(false);
                isFetching.current = false;
                setInitialLoadComplete(true);
                console.log(`Fetch complete (ID: ${fetchId}). HasMore: ${!!nextCursor}`);
            }
        }
    }, []); // No dependencies needed anymore

    // --- Initial Data Fetch ---
    useEffect(() => {
        console.log("TransactionsPage mounted, fetching initial transactions.");
        const fetchId = Date.now();
        filterFetchId.current = fetchId;
        fetchTransactions(null, { dateRange }, fetchId); // Fetch with default date range
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once

    // --- Effect to Fetch Data When Date Filter Changes ---
    useEffect(() => {
        // Avoid refetch on initial mount
        if (!initialLoadComplete && isLoading) return;

        // Need a check to avoid refetching if dateRange hasn't *actually* changed
        // This basic effect runs whenever dateRange *object reference* changes
        console.log("Date range changed, triggering new fetch.");
        const fetchId = Date.now();
        fetchTransactions(null, { dateRange }, fetchId); // Fetch with new date range

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange]); // Only depends on dateRange

    // --- Intersection Observer Setup ---
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const firstEntry = entries[0];
                if (firstEntry.isIntersecting && hasMore && !isLoading && nextCursor && !isFetching.current) {
                    console.log("Observer triggered, loading more...");
                    fetchTransactions(nextCursor, { dateRange }, filterFetchId.current); // Pass current date range
                }
            },
            { threshold: 1.0 }
        );

        const currentObserverRef = observerRef.current;
        if (currentObserverRef) observer.observe(currentObserverRef);
        return () => { if (currentObserverRef) observer.unobserve(currentObserverRef); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, hasMore, nextCursor, dateRange]); // Depends on dateRange for loading more

    // --- Handler to Reset Filters ---
    const handleResetFilters = () => {
        console.log("Resetting filters...");
        const end = new Date();
        const start = subDays(end, 30);
        setDateRange({ from: start, to: end });
        // The useEffect watching dateRange handles the refetch
    };

    // --- Render Logic ---
    return (
        <main className="container mx-auto max-w-6xl p-4 md:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">Transactions</h1>

            {/* Pass only date props to FilterBar */}
            <FilterBar
                dateRange={dateRange}
                setDateRange={setDateRange}
                onResetFilters={handleResetFilters}
                // Remove dummy props - update FilterBar interface too
            />

            {/* Loading, Error, Table, Empty State, Observer (Structure remains) */}
            {isLoading && transactions.length === 0 && (
                <div className="space-y-2 mt-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            )}
            {error && (
                <Alert variant="destructive" className="my-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Transactions</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {transactions.length > 0 && (
                <TransactionsTable transactions={transactions} />
            )}
            {initialLoadComplete && transactions.length === 0 && !error && !isLoading && (
                <div className="text-center py-10 text-muted-foreground">
                    <PackageOpen className="mx-auto h-12 w-12 mb-4" />
                    <p>
                        {areFiltersActive({ dateRange }) // Pass only dateRange
                         ? "No transactions found for the selected date range."
                         : "No transactions found."}
                    </p>
                </div>
            )}
            <div ref={observerRef} className="h-10 flex items-center justify-center mt-4">
                {isLoading && transactions.length > 0 && (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                )}
                {!hasMore && initialLoadComplete && transactions.length > 0 && !isLoading && (
                    <p className="text-sm text-muted-foreground">End of transactions.</p>
                )}
            </div>
        </main>
    );
}