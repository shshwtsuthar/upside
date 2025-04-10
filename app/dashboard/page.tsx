// app/dashboard/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
// Correctly import the exported function
import { getUpAccounts, getUpTransactions, getAllUpTransactionsForDateRange, formatCurrency } from "@/lib/up-api";
import { UpAccountResource, UpTransactionResource, UpTransactionsResponse } from "@/lib/up-api-types";
import { redirect } from 'next/navigation';
import Link from "next/link";

// Import UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Banknote, Landmark, TrendingUp, TrendingDown, AlertCircle, Ban } from 'lucide-react';

// --- Import Client/Helper Components ---
import { PaginatedTransactions } from "@/components/dashboard/PaginatedTransactions";
import { MonthlySpendingCard } from "@/components/dashboard/MonthlySpendingCard";
import { MonthlyIncomeCard } from "@/components/dashboard/MonthlyIncomeCard";

// --- Helper Components Definitions (with explicit 'return') ---
// These can be moved to separate files later if preferred

function MissingTokenPrompt() {
    // Add 'return' statement
    return (
        <Alert variant="destructive" className="mb-6">
            <Ban className="h-4 w-4" />
            <AlertTitle>Up Banking Token Required</AlertTitle>
            <AlertDescription>
                Please configure your Up Banking Personal Access Token in the{' '}
                <Link href="/settings" className="font-semibold underline hover:text-destructive/90">
                    Settings page
                </Link>
                {' '}to view your dashboard.
            </AlertDescription>
        </Alert>
    );
}

function ApiErrorDisplay({ message }: { message: string }) {
    // Add 'return' statement
    return (
        <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Fetching Data</AlertTitle>
            <AlertDescription>
                {message || "Could not fetch data. Please check token or try again later."}
            </AlertDescription>
        </Alert>
    );
}

function TotalBalanceCard({ totalBalance }: { totalBalance: number }) {
     // Add 'return' statement
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
     // Add 'return' statement
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
    let apiError: string | null = null; // For critical errors
    let accounts: UpAccountResource[] = [];
    let initialTransactionsResponse: UpTransactionsResponse | null = null;
    let totalBalance = 0;
    let monthlyIncome: number | null = null;
    let monthlySpending: number | null = null;
    let monthlyCalcError: string | null = null; // Specific error for monthly calcs

    // --- Get Current Month Date Range ---
    const now = new Date();
    // Ensure we get the start of the current month in the server's local timezone first
    const localStartOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    // Ensure we get the start of the *next* month in the server's local timezone (exclusive end)
    const localEndOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

    // --- ADDED LOGGING ---
    // Convert to ISO strings (which will be UTC 'Z') for logging context
    const startOfMonthISO = localStartOfMonth.toISOString();
    const endOfMonthISO = localEndOfMonth.toISOString(); // This is the 'until' value (exclusive)

    console.log(`--- Dashboard Page ---`);
    console.log(`Current Time (Server Local): ${now.toString()}`);
    console.log(`Calculated Start of Month (Local): ${localStartOfMonth.toString()}`);
    console.log(`Calculated End of Month (Local, Exclusive): ${localEndOfMonth.toString()}`);
    console.log(`API Filter - Since (UTC): ${startOfMonthISO}`);
    console.log(`API Filter - Until (UTC): ${endOfMonthISO}`);
    console.log(`----------------------`);
    // --- END LOGGING ---


    try {
        // --- Token Decryption ---
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
                 apiError = "Failed to decrypt your API token. Please re-enter it in Settings.";
             }
        } else {
             return ( <main className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8"><h1 className="text-3xl font-bold mb-6">Dashboard</h1><MissingTokenPrompt /></main> );
        }

        // --- API Data Fetching (only if token is valid) ---
        if (decryptedApiKey) {
            const results = await Promise.allSettled([
                getUpAccounts(decryptedApiKey),
                getUpTransactions(decryptedApiKey, 25),
                // Pass the Date objects - conversion to ISO happens inside the function now
                getAllUpTransactionsForDateRange(decryptedApiKey, localStartOfMonth, localEndOfMonth)
            ]);

            // Process Accounts & Total Balance
            if (results[0].status === 'fulfilled') {
                accounts = results[0].value.data;
                totalBalance = accounts.reduce((sum, account) => sum + account.attributes.balance.valueInBaseUnits, 0);
            } else {
                console.error("Failed to fetch accounts:", results[0].reason);
                if (!apiError) {
                    apiError = `Failed to load account data: ${results[0].reason?.message}`;
                }
            }

            // Process Initial Transactions for Table
            if (results[1].status === 'fulfilled') {
                initialTransactionsResponse = results[1].value;
            } else {
                 console.error("Failed to fetch initial transactions:", results[1].reason);
            }

            // Process Monthly Transactions for Income/Spending
            if (results[2].status === 'fulfilled') {
                const monthlyTransactions = results[2].value;
                // --- ADDED LOGGING ---
                console.log(`--- Dashboard Processing ---`);
                console.log(`Total monthly transactions received: ${monthlyTransactions.length}`);
                // --- END LOGGING ---
                let incomeSum = 0;
                let spendingSum = 0;
                monthlyTransactions.forEach((tx: UpTransactionResource) => {
                    const amount = tx.attributes.amount.valueInBaseUnits;
                    const txDate = tx.attributes.createdAt;
                    // --- ADDED LOGGING ---
                    console.log(`  Processing TX: ID=${tx.id}, Date=${txDate}, Amount=${amount}`);
                    // --- END LOGGING ---
                    if (amount > 0) {
                        incomeSum += amount;
                        // --- ADDED LOGGING ---
                        console.log(`    Added to income. Current incomeSum: ${incomeSum}`);
                        // --- END LOGGING ---
                    } else if (amount < 0) {
                        spendingSum += amount; // Keep it negative for now
                        // --- ADDED LOGGING ---
                        console.log(`    Added to spending. Current spendingSum: ${spendingSum}`);
                        // --- END LOGGING ---
                    } else {
                         // --- ADDED LOGGING ---
                        console.log(`    Amount is zero. Skipping.`);
                         // --- END LOGGING ---
                    }
                });
                monthlyIncome = incomeSum;
                monthlySpending = spendingSum; // Keep spending as negative sum
                // --- ADDED LOGGING ---
                console.log(`Final Calculated Income: ${monthlyIncome}`);
                console.log(`Final Calculated Spending: ${monthlySpending}`); // This will be negative or zero
                console.log(`--------------------------`);
                // --- END LOGGING ---
            } else {
                console.error("Failed to fetch monthly transactions:", results[2].reason);
                monthlyCalcError = `Could not calculate monthly figures: ${results[2].reason?.message}`;
            }
        }

    } catch (error: any) {
        console.error("Critical error loading dashboard data:", error);
        if (!apiError) {
            let caughtErrorMessage = error.message || "An unexpected error occurred preparing the dashboard.";
            if (error.message?.includes("401")) {
                 caughtErrorMessage = "Your Up Banking token seems invalid or expired. Please update it in Settings.";
            }
            apiError = caughtErrorMessage;
        }
    }

    const isMonthlyLoading = !!(decryptedApiKey && !apiError && !monthlyCalcError && monthlyIncome === null && monthlySpending === null);

    // --- Rendering ---
    return (
        <main className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

            {apiError && <ApiErrorDisplay message={apiError} />}

            {!apiError && decryptedApiKey && (
                <>
                    <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mb-6">
                         <TotalBalanceCard totalBalance={totalBalance} />
                         <MonthlyIncomeCard
                             incomeAmount={monthlyIncome}
                             isLoading={isMonthlyLoading}
                             error={monthlyCalcError}
                          />
                         <MonthlySpendingCard
                             spendingAmount={monthlySpending} // Pass the negative sum
                             isLoading={isMonthlyLoading}
                             error={monthlyCalcError}
                         />
                    </div>

                    {accounts.length > 0 && (
                        <div className="mb-6"><AccountsCard accounts={accounts} /></div>
                    )}
                    {accounts.length === 0 && (
                        <Alert className="mb-6">
                           <Landmark className="h-4 w-4" />
                           <AlertTitle>No Accounts Found</AlertTitle>
                           <AlertDescription>We couldn't find any accounts associated with your Up token.</AlertDescription>
                        </Alert>
                    )}

                    {initialTransactionsResponse && (
                        <div className="mb-6"><PaginatedTransactions initialTransactions={initialTransactionsResponse.data} initialLinks={initialTransactionsResponse.links}/></div>
                    )}
                    {!initialTransactionsResponse && !monthlyCalcError && (
                        <Alert variant="default" className="mb-6">
                            <TrendingUp className="h-4 w-4" />
                            <AlertTitle>Transactions</AlertTitle>
                            <AlertDescription>Could not load initial transactions list.</AlertDescription>
                        </Alert>
                    )}
                </>
            )}
        </main>
    );
}