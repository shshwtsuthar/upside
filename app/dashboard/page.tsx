// app/dashboard/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { getUpAccounts, getUpTransactions, formatCurrency } from "@/lib/up-api";
import { UpAccountResource, UpTransactionResource, UpTransactionsResponse } from "@/lib/up-api-types";
import { redirect } from 'next/navigation';
import Link from "next/link";

// Import UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Banknote, Landmark, TrendingUp, AlertCircle, Ban } from 'lucide-react';

// --- Import the Paginated Transactions Client Component ---
import { PaginatedTransactions } from "@/components/dashboard/PaginatedTransactions";

// --- Helper Components ---
function MissingTokenPrompt() {
    return (
        <Alert variant="destructive" className="mb-6">
            <Ban className="h-4 w-4" />
            <AlertTitle>Up Banking Token Required</AlertTitle>
            <AlertDescription>
                Please configure your Up Banking Personal Access Token in the Settings page to view your dashboard.
            </AlertDescription>
        </Alert>
    );
}

function ApiErrorDisplay({ message }: { message: string }) {
    return (
        <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Fetching Data</AlertTitle>
            <AlertDescription>
                {message || "Could not fetch data. Please check your token in Settings or try again later."}
            </AlertDescription>
        </Alert>
    );
}

function TotalBalanceCard({ totalBalance }: { totalBalance: number }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Total Balance
                </CardTitle>
                <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {formatCurrency(totalBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                    Sum of all account balances
                </p>
            </CardContent>
        </Card>
    );
}

function AccountsCard({ accounts }: { accounts: UpAccountResource[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Accounts</CardTitle>
                <CardDescription>Your individual Up accounts.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                {accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between space-x-4 rounded-md border p-4">
                        <div className="flex items-center space-x-4">
                            <Landmark className="h-6 w-6 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium leading-none">{account.attributes.displayName}</p>
                                <p className="text-sm text-muted-foreground">{account.attributes.accountType}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className="text-sm font-semibold">{formatCurrency(account.attributes.balance.valueInBaseUnits)}</p>
                             <p className="text-xs text-muted-foreground">{account.attributes.ownershipType}</p>
                        </div>
                    </div>
                ))}
                 {accounts.length === 0 && (
                     <p className="text-sm text-muted-foreground">No accounts found.</p>
                 )}
            </CardContent>
        </Card>
    );
}

// --- Main Dashboard Page Component (Server Component) ---
export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/api/auth/signin?callbackUrl=/dashboard');
    }

    let decryptedApiKey: string | null = null;
    let apiError: string | null = null; // Initialize as null
    let accounts: UpAccountResource[] = [];
    let initialTransactionsResponse: UpTransactionsResponse | null = null;
    let totalBalance = 0;

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { encryptedUpToken: true, upTokenIv: true, upTokenAuthTag: true }
        });

        if (!user) throw new Error("User not found.");

        if (user.encryptedUpToken && user.upTokenIv && user.upTokenAuthTag) {
            decryptedApiKey = decryptToken({
                encryptedToken: user.encryptedUpToken,
                iv: user.upTokenIv,
                authTag: user.upTokenAuthTag
            });
             if (!decryptedApiKey) {
                 // Decryption failed - set error message here
                 apiError = "Failed to decrypt your API token. Please re-enter it in Settings.";
             }
        } else {
             // Token not configured, render prompt immediately
             return (
                 <main className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
                     <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
                     <MissingTokenPrompt />
                 </main>
             );
        }

        // Fetch Data ONLY if token was successfully decrypted
        if (decryptedApiKey) {
            const [accountsResponse, transactionsPageResponse] = await Promise.all([
                getUpAccounts(decryptedApiKey),
                getUpTransactions(decryptedApiKey, 25)
            ]);

            accounts = accountsResponse.data;
            initialTransactionsResponse = transactionsPageResponse;
            totalBalance = accounts.reduce((sum, account) => sum + account.attributes.balance.valueInBaseUnits, 0);
        }
        // If decryption failed (apiError is already set), we skip fetching

    } catch (error: any) {
        // Catch errors from DB access or API fetches
        console.error("Error loading dashboard data:", error);

        // If apiError was *already set* by the decryption check, keep that specific message.
        // Otherwise, determine the message from the current error.
        if (!apiError) { // Check if apiError is still null
            // Determine the base error message for this new error
            let currentErrorMessage = error.message || "An unexpected error occurred while loading dashboard data.";

            // Refine the message if it's a 401 error from the API fetch
            if (error.message?.includes("401")) {
                 currentErrorMessage = "Your Up Banking token seems invalid or expired. Please update it in Settings.";
            }
            // Assign the determined message
            apiError = currentErrorMessage;
        }
        // If apiError was already the "Failed to decrypt..." message, it remains unchanged by this block.
    }

    // --- Rendering Logic ---
    return (
        <main className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

            {/* Display API errors (if any occurred) */}
            {apiError && <ApiErrorDisplay message={apiError} />}

            {/* Display data only if NO error occurred */}
            {!apiError && decryptedApiKey && (
                <>
                    {/* Balance Card */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 mb-6">
                         <TotalBalanceCard totalBalance={totalBalance} />
                    </div>

                    {/* Accounts List */}
                    {accounts.length > 0 && (
                         <div className="mb-6">
                             <AccountsCard accounts={accounts} />
                         </div>
                     )}
                     {accounts.length === 0 && ( // Show if accounts fetch was ok but returned empty
                        <Alert className="mb-6">
                           <Landmark className="h-4 w-4" />
                           <AlertTitle>No Accounts Found</AlertTitle>
                           <AlertDescription>We couldn't find any accounts associated with your Up token.</AlertDescription>
                        </Alert>
                     )}

                    {/* Paginated Transactions */}
                    {initialTransactionsResponse && (
                        <div className="mb-6">
                            <PaginatedTransactions
                                initialTransactions={initialTransactionsResponse.data}
                                initialLinks={initialTransactionsResponse.links}
                            />
                        </div>
                    )}
                     {!initialTransactionsResponse && ( // Show if transactions didn't load (but no other critical error)
                          <Alert variant="default" className="mb-6">
                               <TrendingUp className="h-4 w-4" />
                               <AlertTitle>Transactions</AlertTitle>
                               <AlertDescription>Could not load initial transactions.</AlertDescription>
                          </Alert>
                      )}
                </>
            )}
        </main>
    );
}