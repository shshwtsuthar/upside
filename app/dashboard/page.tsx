// app/dashboard/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { decryptToken } from "@/lib/crypto";
import { getUpAccounts, getUpTransactions, getAllUpTransactionsForDateRange, formatCurrency } from "@/lib/up-api";
import { UpAccountResource, UpTransactionResource, UpTransactionsResponse } from "@/lib/up-api-types";
import { redirect } from 'next/navigation';
import Link from "next/link";
import { getPrismaInstance } from '@/lib/prisma'; 
const prisma = getPrismaInstance(); 
// Import UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Banknote, Landmark, TrendingUp, TrendingDown, AlertCircle, Ban } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton"; // <-- ** Ensure Skeleton is imported **

// --- Import Client/Helper Components ---
import { MonthlySpendingCard } from "@/components/dashboard/MonthlySpendingCard";
import { MonthlyIncomeCard } from "@/components/dashboard/MonthlyIncomeCard";
import { SpendingByCategoryChart } from "@/components/dashboard/SpendingByCategoryChart";

// --- Helper Components Definitions (Moved outside DashboardPage function) ---

function MissingTokenPrompt() {
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
    let apiError: string | null = null;
    let accounts: UpAccountResource[] = [];
    let totalBalance = 0;
    let monthlyIncome: number | null = null;
    let monthlySpending: number | null = null;
    let monthlyCalcError: string | null = null;
    let monthlyTransactions: UpTransactionResource[] | null = null;

    const now = new Date();
    const localStartOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const localEndOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

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
            // Use the component now defined outside
             return ( <main className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8"><h1 className="text-3xl font-bold mb-6">Dashboard</h1><MissingTokenPrompt /></main> );
        }

        // --- API Data Fetching ---
        if (decryptedApiKey) {
             const results = await Promise.allSettled([
                 getUpAccounts(decryptedApiKey),
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

            // Process Monthly Transactions for Income/Spending AND the chart
            if (results[1].status === 'fulfilled') {
                monthlyTransactions = results[1].value;
                let incomeSum = 0;
                let spendingSum = 0;
                monthlyTransactions.forEach((tx: UpTransactionResource) => {
                    const amount = tx.attributes.amount.valueInBaseUnits;
                    if (amount > 0) { incomeSum += amount; }
                    else if (amount < 0) { spendingSum += amount; }
                });
                monthlyIncome = incomeSum;
                monthlySpending = spendingSum;
            } else {
                console.error("Failed to fetch monthly transactions:", results[1].reason);
                monthlyCalcError = `Could not calculate monthly figures or chart data: ${results[1].reason?.message}`;
                 if (!apiError) {
                     apiError = `Failed to load transaction data: ${results[1].reason?.message}`;
                 }
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

    const isLoadingData = !!(decryptedApiKey && !apiError && (monthlyIncome === null || monthlySpending === null || monthlyTransactions === null));

    // --- Rendering ---
    return (
        <main className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

            {/* Use the component now defined outside */}
            {apiError && <ApiErrorDisplay message={apiError} />}

            {!apiError && decryptedApiKey && (
                <>
                    {/* Summary Cards Grid */}
                    <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                         {/* Use the component now defined outside */}
                         <TotalBalanceCard totalBalance={totalBalance} />
                         <MonthlyIncomeCard
                             incomeAmount={monthlyIncome}
                             isLoading={isLoadingData}
                             error={monthlyCalcError}
                          />
                         <MonthlySpendingCard
                             spendingAmount={monthlySpending}
                             isLoading={isLoadingData}
                             error={monthlyCalcError}
                         />
                    </div>

                    {/* Accounts List & Spending Chart Grid */}
                    <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2 mb-6">
                        {/* Spending Chart */}
                        <div>
                           <SpendingByCategoryChart
                                transactions={monthlyTransactions}
                                isLoading={isLoadingData}
                                error={monthlyCalcError}
                            />
                        </div>

                        {/* Accounts List */}
                        <div>
                             {/* Use the component now defined outside */}
                            {accounts.length > 0 ? (
                                <AccountsCard accounts={accounts} />
                            ) : (
                                // Show placeholder/skeleton if accounts are loading but other data might be ready
                                isLoadingData && !apiError ? (
                                   <Card>
                                       <CardHeader>
                                            {/* Use the imported Skeleton component */}
                                            <Skeleton className="h-6 w-1/2" />
                                            <Skeleton className="h-4 w-3/4" />
                                        </CardHeader>
                                       <CardContent className="space-y-4">
                                            {/* Use the imported Skeleton component */}
                                            <Skeleton className="h-16 w-full" />
                                            <Skeleton className="h-16 w-full" />
                                        </CardContent>
                                   </Card>
                                ) : (
                                   // Show error/empty state only if not loading and accounts are empty
                                   !isLoadingData && accounts.length === 0 &&
                                   <Alert>
                                       <Landmark className="h-4 w-4" />
                                       <AlertTitle>No Accounts Found</AlertTitle>
                                       <AlertDescription>We couldn't find any accounts associated with your Up token.</AlertDescription>
                                   </Alert>
                                )
                            )}
                        </div>
                    </div>
                </>
            )}
        </main>
    );
}