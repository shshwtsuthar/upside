// components/dashboard/PaginatedTransactions.tsx

// correction on loading indicator logic in the buttons above - it should show when pending and the relevant link exists
// Initially, I thought about just passing nextLink. It's better to pass the whole links object (prev and next) from the start and update it entirely on each fetch. This simplifies state management. Also added useTransition for a smoother loading experience.

"use client";

import React, { useState, useTransition } from 'react';
import { UpTransactionResource, UpTransactionsResponse } from '@/lib/up-api-types';
import { TransactionsTable } from '@/components/dashboard/TransactionsTable';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle } from 'lucide-react';

interface PaginatedTransactionsProps {
    initialTransactions: UpTransactionResource[];
    initialLinks: {
        prev: string | null;
        next: string | null;
    };
}

// Helper function to extract cursor info from Up API URL
function getCursorInfo(url: string | null): { type: 'after' | 'before' | null; value: string | null } {
    if (!url) return { type: null, value: null };
    try {
        const urlParams = new URL(url).searchParams;
        if (urlParams.has('page[after]')) {
            return { type: 'after', value: urlParams.get('page[after]') };
        }
        if (urlParams.has('page[before]')) {
            return { type: 'before', value: urlParams.get('page[before]') };
        }
    } catch (e) {
        console.error("Failed to parse Up API URL:", url, e);
    }
    return { type: null, value: null };
}


export function PaginatedTransactions({ initialTransactions, initialLinks }: PaginatedTransactionsProps) {
    const [transactions, setTransactions] = useState<UpTransactionResource[]>(initialTransactions);
    // Store only the cursor info now, not the full URLs
    const [nextCursor, setNextCursor] = useState<string | null>(getCursorInfo(initialLinks.next).value);
    const [prevCursor, setPrevCursor] = useState<string | null>(getCursorInfo(initialLinks.prev).value);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const fetchPage = async (direction: 'next' | 'prev') => {
        const cursorType = direction === 'next' ? 'after' : 'before';
        const cursorValue = direction === 'next' ? nextCursor : prevCursor;

        if (!cursorValue) return; // No cursor available for this direction

        setError(null); // Clear previous errors

        startTransition(async () => {
            try {
                // Construct the URL for our API route with cursor info
                const apiRouteUrl = `/api/user/transactions?cursorType=${cursorType}&cursorValue=${encodeURIComponent(cursorValue)}`;
                const response = await fetch(apiRouteUrl);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Failed to fetch transactions (HTTP ${response.status})`);
                }

                const data: UpTransactionsResponse = await response.json();
                setTransactions(data.data);

                // Update cursors based on the *new* links received
                setNextCursor(getCursorInfo(data.links.next).value);
                setPrevCursor(getCursorInfo(data.links.prev).value);

            } catch (err: any) {
                console.error("Error fetching transaction page:", err);
                setError(err.message || "An unexpected error occurred.");
            }
        });
    };

    return (
        <div>
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Transactions</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <TransactionsTable transactions={transactions} />

            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchPage('prev')}
                    disabled={!prevCursor || isPending} // Disable if no prev cursor or loading
                >
                    {isPending && prevCursor ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchPage('next')}
                    disabled={!nextCursor || isPending} // Disable if no next cursor or loading
                >
                     {isPending && nextCursor ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Next
                </Button>
            </div>
        </div>
    );
}