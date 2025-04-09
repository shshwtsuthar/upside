// app/api/user/transactions/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from '@/lib/prisma';
import { decryptToken } from '@/lib/crypto';
import { UpTransactionsResponse, UpErrorResponse } from '@/lib/up-api-types';

const UP_API_BASE_URL = 'https://api.up.com.au/api/v1';
const DEFAULT_PAGE_SIZE = 25; // Or make configurable

/**
 * Fetches a specific page of transactions from the Up API using a relative path.
 */
async function fetchTransactionPage(token: string, relativePath: string): Promise<UpTransactionsResponse> {
     // Basic validation on the constructed path
     if (!relativePath || !relativePath.startsWith('/transactions')) {
         throw new Error('Invalid relative path provided for Up API transaction fetch.');
     }

    const url = `${UP_API_BASE_URL}${relativePath}`; // Construct full URL
    console.log("Fetching from Up API:", url); // Log the URL being fetched
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
    };

    try {
        const response = await fetch(url, { method: 'GET', headers });

        if (!response.ok) {
             let errorBody: UpErrorResponse | { message?: string } | null = null;
             try { errorBody = await response.json(); } catch (jsonError) {}
             let errorMessage = `Up API Error (${response.status}): Failed to fetch ${relativePath}.`;
             if (errorBody && 'errors' in errorBody && errorBody.errors.length > 0) {
                 errorMessage = `Up API Error (${response.status}): ${errorBody.errors[0].title} - ${errorBody.errors[0].detail}`;
             } else if (errorBody && 'message' in errorBody && errorBody.message) {
                 errorMessage = `Up API Error (${response.status}): ${errorBody.message}`;
             }
            console.error("Up API Request Failed:", { url: url, status: response.status, errorBody });
            throw new Error(errorMessage);
        }

        const data: UpTransactionsResponse = await response.json();
        return data;

    } catch (error: any) {
        console.error(`Error during Up API call to ${url}:`, error);
        throw new Error(error.message || `Network error or failure fetching from Up API: ${url}`);
    }
}


// --- Handler for GET requests ---
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get cursor info from query parameters
    const { searchParams } = new URL(request.url);
    const cursorType = searchParams.get('cursorType'); // 'after' or 'before'
    const cursorValue = searchParams.get('cursorValue'); // The actual cursor string

    // Validate cursor parameters
    if (!cursorType || !cursorValue || (cursorType !== 'after' && cursorType !== 'before')) {
        return NextResponse.json({ error: 'Missing or invalid cursorType/cursorValue query parameters' }, { status: 400 });
    }

    // 3. Construct the relative path for the Up API call
    // Use encodeURIComponent just in case cursor has special chars, though likely unnecessary for Up cursors
    const encodedCursorValue = encodeURIComponent(cursorValue);
    const relativePath = `/transactions?page[size]=${DEFAULT_PAGE_SIZE}&page[${cursorType}]=${encodedCursorValue}`;

    try {
        // 4. Get User & Decrypt Token (same as before)
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { encryptedUpToken: true, upTokenIv: true, upTokenAuthTag: true }
        });
        if (!user?.encryptedUpToken || !user.upTokenIv || !user.upTokenAuthTag) {
            return NextResponse.json({ error: 'API token not configured.' }, { status: 400 });
        }
        const decryptedApiKey = decryptToken({
            encryptedToken: user.encryptedUpToken,
            iv: user.upTokenIv,
            authTag: user.upTokenAuthTag
        });
        if (!decryptedApiKey) {
            return NextResponse.json({ error: 'Failed to decrypt API token.' }, { status: 500 });
        }

        // 5. Fetch the specific page from Up API using the *constructed relative path*
        const transactionData = await fetchTransactionPage(decryptedApiKey, relativePath);

        // 6. Return the fetched data
        return NextResponse.json(transactionData, { status: 200 });

    } catch (error: any) {
        console.error(`Error fetching transaction page (${relativePath}):`, error);
        const status = error.message?.includes("401") || error.message?.includes("decrypt") ? 401 : 500;
        return NextResponse.json({ error: error.message || 'Failed to fetch transaction page.' }, { status });
    }
}