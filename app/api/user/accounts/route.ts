// app/api/user/accounts/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions"; // <-- Updated importimport prisma from '@/lib/prisma';
import { decryptToken } from '@/lib/crypto';
import { getUpAccounts } from '@/lib/up-api'; // Reuse existing function
import { UpAccountResource } from '@/lib/up-api-types';

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Get User & Decrypt Token
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
            console.error(`Decryption failed for user ${session.user.id} when fetching accounts.`);
            return NextResponse.json({ error: 'Failed to access API token.' }, { status: 500 });
        }

        // 2. Fetch Accounts using the existing library function
        // Assuming getUpAccounts fetches all accounts (or enough for typical user)
        // Add pagination handling here if Up paginates accounts and users might have many
        const accountsResponse = await getUpAccounts(decryptedApiKey);

        // 3. Return just the data array
        return NextResponse.json(accountsResponse.data, { status: 200 });

    } catch (error: any) {
        console.error(`Error fetching accounts for user ${session.user?.id}:`, error);
        const status = error.message?.includes("401") ? 401 : 500;
        const clientMessage = status === 401 ? "Up API Authorization Failed." : "Failed to fetch accounts.";
        return NextResponse.json({ error: clientMessage }, { status });
    }
}