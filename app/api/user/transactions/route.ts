// app/api/user/transactions/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { getPrismaInstance } from '@/lib/prisma'; 

const prisma = getPrismaInstance();
import { decryptToken } from '@/lib/crypto';
import { UpTransactionsResponse, UpErrorResponse } from '@/lib/up-api-types';

const UP_API_BASE_URL = 'https://api.up.com.au/api/v1';
const DEFAULT_PAGE_SIZE = 25;

// --- fetchTransactionPage Helper Function (Remains the same) ---
async function fetchTransactionPage(token: string, pathOrUrl: string): Promise<UpTransactionsResponse> {
     const isRelativePath = pathOrUrl.startsWith('/');
     const url = isRelativePath ? `${UP_API_BASE_URL}${pathOrUrl}` : pathOrUrl;
     console.log("Fetching (API Route):", url.split('?')[0] + '?...');
     const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };
     try {
         const response = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
         if (!response.ok) {
             let errorBody: UpErrorResponse | { message?: string } | null = null;
             try { errorBody = await response.json(); } catch (jsonError) {}
             let errorMessage = `Up API Error (${response.status}): Failed to fetch transactions.`;
              if (errorBody && 'errors' in errorBody && errorBody.errors.length > 0) {
                  errorMessage = `Up API Error (${response.status}): ${errorBody.errors[0].title} - ${errorBody.errors[0].detail}`;
              } else if (errorBody && 'message' in errorBody && errorBody.message) {
                  errorMessage = `Up API Error (${response.status}): ${errorBody.message}`;
              }
             console.error("Up API Request Failed:", { url: url.split('?')[0], status: response.status, errorBody });
             throw new Error(errorMessage);
         }
         const text = await response.text();
         if (!text) {
             console.warn(`Empty response body received from ${url.split('?')[0]}`);
             return { data: [], links: { prev: null, next: null } };
         }
         return JSON.parse(text) as UpTransactionsResponse;
     } catch (error: any) {
         console.error(`Error during Up API call to ${url.split('?')[0]}:`, error);
         throw new Error(error.message || `Network error or failure fetching from Up API.`);
     }
}

// --- Handler for GET requests ---
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Pagination Params
    const cursorType = searchParams.get('cursorType');
    const cursorValue = searchParams.get('cursorValue');

    // Filter Params - Only Date
    const since = searchParams.get('since');
    const until = searchParams.get('until');
    // Removed accountIds and type parsing

    console.log("--- API Route Received ---");
    console.log("Cursor Type:", cursorType);
    console.log("Cursor Value:", cursorValue);
    console.log("Since:", since);
    console.log("Until:", until);
    console.log("-------------------------");

    const apiParams = new URLSearchParams();
    apiParams.set('page[size]', DEFAULT_PAGE_SIZE.toString());

    // Add pagination cursor if provided
    if (cursorType === 'after' && cursorValue) apiParams.set('page[after]', cursorValue);
    else if (cursorType === 'before' && cursorValue) apiParams.set('page[before]', cursorValue);

    // Add only date filters if provided
    if (since) apiParams.set('filter[since]', since);
    if (until) apiParams.set('filter[until]', until);

    // Removed logic for adding account and type filters to apiParams

    const apiPath = `/transactions?${apiParams.toString()}`;
    console.log(">>> Constructed Up API path:", apiPath);

    try {
        // Token decryption logic
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { encryptedUpToken: true, upTokenIv: true, upTokenAuthTag: true }
        });
        if (!user || !user.encryptedUpToken || !user.upTokenIv || !user.upTokenAuthTag) {
            return NextResponse.json({ error: 'API token not configured.' }, { status: 400 });
        }
        const decryptedApiKey = decryptToken({
            encryptedToken: user.encryptedUpToken,
            iv: user.upTokenIv,
            authTag: user.upTokenAuthTag
        });
        if (!decryptedApiKey) {
            console.error(`Decryption failed for user ${session.user.id}.`);
            return NextResponse.json({ error: 'Failed to access API token.' }, { status: 500 });
        }

        // Fetch from Up API
        const transactionData = await fetchTransactionPage(decryptedApiKey, apiPath);

        return NextResponse.json(transactionData, { status: 200 });

    } catch (error: any) {
        // Error handling
         console.error(`Error handling transaction request (${apiPath}):`, error);
         let status = 500;
         if (error.message?.includes("401")) status = 401;
         else if (error.message?.includes("400")) status = 400;
         else if (error.message?.includes("API token not configured")) status = 400;
         else if (error.message?.includes("Failed to access API token")) status = 500;
         const clientErrorMessage = status === 401 ? "Up API Authorization Failed."
                                : status === 400 ? "Invalid request or token not configured."
                                : "Failed to fetch transactions.";
         return NextResponse.json({ error: clientErrorMessage }, { status });
    }
}