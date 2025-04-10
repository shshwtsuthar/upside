// lib/up-api.ts

import { UpAccountsResponse, UpTransactionsResponse, UpErrorResponse, UpTransactionResource } from './up-api-types';

const UP_API_BASE_URL = 'https://api.up.com.au/api/v1';
const MAX_PAGE_SIZE = 100; // Up API max page size

interface FetchUpApiOptions extends RequestInit {
    token: string;
}

/**
 * Generic fetcher for the Up Banking API.
 * Handles authorization and base URL.
 * Throws an error with details if the API returns an error status.
 */
async function fetchUpApi<T>(endpoint: string, { token, ...options }: FetchUpApiOptions): Promise<T> {
    // Ensure endpoint starts with / or is a full URL starting from base
    const url = endpoint.startsWith('/')
        ? `${UP_API_BASE_URL}${endpoint}`
        : endpoint; // Allow full URLs passed from pagination links

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
    };

    // Don't log token here for security
    // console.log("Fetching from Up API:", url); // Basic URL log

    try {
        // Add cache option if provided (used for debugging)
        const fetchOptions = { ...options, headers };
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            let errorBody: UpErrorResponse | { message?: string } | null = null;
            try {
                errorBody = await response.json();
            } catch (jsonError) { }

            let errorMessage = `Up API Error (${response.status}): Failed to fetch ${endpoint.split('?')[0]}.`; // Simplified endpoint
            if (errorBody && 'errors' in errorBody && errorBody.errors.length > 0) {
                errorMessage = `Up API Error (${response.status}): ${errorBody.errors[0].title} - ${errorBody.errors[0].detail}`;
            } else if (errorBody && 'message' in errorBody && errorBody.message) {
                errorMessage = `Up API Error (${response.status}): ${errorBody.message}`;
            }

            console.error("Up API Request Failed:", { url: url.split('?')[0], status: response.status, errorBody }); // Log simplified URL
            throw new Error(errorMessage);
        }

        if (response.status === 204) {
            return null as T;
        }

        const data: T = await response.json();
        return data;

    } catch (error: any) {
        console.error(`Error during Up API call to ${url.split('?')[0]}:`, error); // Log simplified URL
        throw new Error(error.message || `Network error or failure fetching from Up API: ${url.split('?')[0]}`);
    }
}


// --- Specific API Functions ---

/**
 * Fetches all accounts for the authenticated user.
 */
export async function getUpAccounts(token: string): Promise<UpAccountsResponse> {
    return fetchUpApi<UpAccountsResponse>('/accounts', { token, method: 'GET' });
}

/**
 * Fetches recent transactions for the authenticated user (first page).
 */
export async function getUpTransactions(token: string, pageSize: number = 25): Promise<UpTransactionsResponse> {
    const endpoint = `/transactions?page[size]=${pageSize}`;
    return fetchUpApi<UpTransactionsResponse>(endpoint, { token, method: 'GET' });
}

/**
 * Fetches ALL transactions for a given date range, handling pagination.
 */
export async function getAllUpTransactionsForDateRange(
    token: string,
    since: Date, // Expecting Date object
    until: Date, // Expecting Date object
    maxPages: number = 10 // Safety limit
): Promise<UpTransactionResource[]> {

    let allTransactions: UpTransactionResource[] = [];
    const sinceIso = since.toISOString();
    const untilIso = until.toISOString(); // Up API 'until' is exclusive

    // --- ADDED LOGGING ---
    console.log(`--- lib/up-api.ts ---`);
    console.log(`getAllUpTransactionsForDateRange received:`);
    console.log(`  since (Date object):`, since.toString());
    console.log(`  until (Date object):`, until.toString());
    console.log(`Generated filter[since] (UTC): ${sinceIso}`);
    console.log(`Generated filter[until] (UTC): ${untilIso}`);
    // --- END LOGGING ---

    const params = new URLSearchParams({
        'filter[since]': sinceIso,
        'filter[until]': untilIso,
        'page[size]': MAX_PAGE_SIZE.toString(),
    });
    let nextUrl: string | null = `${UP_API_BASE_URL}/transactions?${params.toString()}`;
    // --- ADDED LOGGING ---
    console.log(`Initial Fetch URL: ${nextUrl}`);
    console.log(`---------------------`);
    // --- END LOGGING ---

    let pagesFetched = 0;

    try {
        while (nextUrl && pagesFetched < maxPages) {
            pagesFetched++;
            // --- ADDED LOGGING ---
            console.log(`Fetching page ${pagesFetched} from: ${nextUrl.split('?')[0]}...?page[size]=...`); // Simplified URL
            // --- END LOGGING ---

            // Explicitly type the response variable and add cache option for debugging
            const response: UpTransactionsResponse = await fetchUpApi<UpTransactionsResponse>(nextUrl, {
                 token,
                 method: 'GET',
            });


            if (response && response.data && response.data.length > 0) {
                 // --- ADDED LOGGING ---
                 console.log(`  Page ${pagesFetched} Transactions (${response.data.length}):`);
                 response.data.forEach(tx => {
                     console.log(`    ID: ${tx.id}, Date: ${tx.attributes.createdAt}, Amount: ${tx.attributes.amount.valueInBaseUnits}`);
                 });
                 // --- END LOGGING ---
                 allTransactions = allTransactions.concat(response.data);
            } else {
                 // --- ADDED LOGGING ---
                 console.log(`  Page ${pagesFetched}: No transactions data found or empty response.`);
                 // --- END LOGGING ---
            }

            nextUrl = response?.links?.next ?? null;
            if (!nextUrl) {
                 // --- ADDED LOGGING ---
                 console.log("  No next page link found.");
                 // --- END LOGGING ---
            } else {
                 // Optional: Log next URL for confirmation
                 // console.log("  Next page URL exists:", nextUrl.split('?')[0] + "...");
            }
        }

        if (pagesFetched >= maxPages && nextUrl) {
            console.warn(`Reached max page limit (${maxPages}) while fetching transactions. Data might be incomplete.`);
        }

    } catch (error: any) {
        console.error(`Error fetching transactions after ${pagesFetched} pages:`, error);
        throw new Error(`Failed to fetch all transactions: ${error.message}`);
    }
    // --- ADDED LOGGING ---
    console.log(`Finished fetching. Total transactions for range: ${allTransactions.length}`);
    // --- END LOGGING ---
    return allTransactions;
}


// --- Utility Function for Formatting Money ---
export function formatCurrency(amountInBaseUnits: number, currencyCode: string = 'AUD'): string {
    const amount = amountInBaseUnits / 100;
    return new Intl.NumberFormat('en-AU', { // Adjust locale as needed
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
}