// lib/up-api.ts

import { UpAccountsResponse, UpTransactionsResponse, UpErrorResponse } from './up-api-types';

const UP_API_BASE_URL = 'https://api.up.com.au/api/v1';

interface FetchUpApiOptions extends RequestInit {
    token: string;
}

/**
 * Generic fetcher for the Up Banking API.
 * Handles authorization and base URL.
 * Throws an error with details if the API returns an error status.
 */
async function fetchUpApi<T>(endpoint: string, { token, ...options }: FetchUpApiOptions): Promise<T> {
    const url = `${UP_API_BASE_URL}${endpoint}`;
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            // Attempt to parse error details from the response body
            let errorBody: UpErrorResponse | { message?: string } | null = null;
            try {
                errorBody = await response.json();
            } catch (jsonError) {
                // Ignore if response body is not valid JSON
            }

            let errorMessage = `Up API Error (${response.status}): Failed to fetch ${endpoint}.`;
            if (errorBody && 'errors' in errorBody && errorBody.errors.length > 0) {
                errorMessage = `Up API Error (${response.status}): ${errorBody.errors[0].title} - ${errorBody.errors[0].detail}`;
            } else if (errorBody && 'message' in errorBody && errorBody.message) {
                errorMessage = `Up API Error (${response.status}): ${errorBody.message}`;
            }

            console.error("Up API Request Failed:", { url, status: response.status, errorBody });
            throw new Error(errorMessage);
        }

        // Handle cases like 204 No Content if needed, otherwise assume JSON
        if (response.status === 204) {
            return null as T; // Or handle as appropriate for the specific endpoint
        }

        const data: T = await response.json();
        return data;

    } catch (error: any) {
        // Log network errors or errors during fetch/parsing
        console.error(`Error during Up API call to ${endpoint}:`, error);
        // Re-throw the original error or a new generic one
        throw new Error(error.message || `Network error or failure fetching from Up API: ${endpoint}`);
    }
}


// --- Specific API Functions ---

/**
 * Fetches all accounts for the authenticated user.
 */
export async function getUpAccounts(token: string): Promise<UpAccountsResponse> {
    // Up API might paginate accounts, but usually users have few.
    // For simplicity, we fetch the first page. Add pagination handling if needed.
    return fetchUpApi<UpAccountsResponse>('/accounts', { token, method: 'GET' });
}

/**
 * Fetches recent transactions for the authenticated user.
 */
export async function getUpTransactions(token: string, pageSize: number = 25): Promise<UpTransactionsResponse> {
    // Fetch most recent transactions across all accounts
    const endpoint = `/transactions?page[size]=${pageSize}`;
    return fetchUpApi<UpTransactionsResponse>(endpoint, { token, method: 'GET' });
}

// --- Utility Function for Formatting Money ---
export function formatCurrency(amountInBaseUnits: number, currencyCode: string = 'AUD'): string {
    const amount = amountInBaseUnits / 100;
    return new Intl.NumberFormat('en-AU', { // Adjust locale as needed
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
}