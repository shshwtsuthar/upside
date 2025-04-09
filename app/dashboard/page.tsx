// app/dashboard/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import { getUpAccounts, getUpTransactions, formatCurrency } from "@/lib/up-api"; // Import API functions
import { UpAccountResource, UpTransactionResource } from "@/lib/up-api-types"; // Import types
import { redirect } from 'next/navigation'; // For redirecting
import Link from "next/link";

// Import UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; // For transaction status
import { Banknote, Landmark, TrendingUp, AlertCircle, Ban } from 'lucide-react'; // Icons

// --- Helper Components ---

// Simple component to show when API token is missing or invalid
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

// Component to display general API errors
function ApiErrorDisplay({ message }: { message: string }) {
    return (
        <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Fetching Data</AlertTitle>
            <AlertDescription>
                {message || "Could not fetch data from the Up Banking API. Please check your token in Settings or try again later."}
            </AlertDescription>
        </Alert>
    );
}

// Component for displaying total balance
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

// Component for displaying individual accounts
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

// Component for displaying recent transactions table
function TransactionsTable({ transactions }: { transactions: UpTransactionResource[] }) {
     return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your latest transactions across all accounts.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((tx) => (
                            <TableRow key={tx.id}>
                                <TableCell className="font-medium max-w-[250px] truncate" title={tx.attributes.description}>
                                    {tx.attributes.description}
                                    {tx.attributes.message && (
                                         <p className="text-xs text-muted-foreground italic truncate" title={tx.attributes.message}>"{tx.attributes.message}"</p>
                                    )}
                                    </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {tx.relationships.category?.data?.id ?? 'Uncategorized'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {new Date(tx.attributes.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={tx.attributes.status === 'SETTLED' ? 'default' : 'secondary'}>
                                        {tx.attributes.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className={`text-right font-semibold ${tx.attributes.amount.valueInBaseUnits > 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                                    {formatCurrency(tx.attributes.amount.valueInBaseUnits)}
                                </TableCell>
                            </TableRow>
                        ))}
                         {transactions.length === 0 && (
                             <TableRow>
                                 <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                     No recent transactions found.
                                 </TableCell>
                             </TableRow>
                         )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// --- Main Dashboard Page Component ---

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    // 1. Check Authentication
    if (!session?.user?.id) {
        // Not strictly needed if using middleware, but good practice
        redirect('/api/auth/signin?callbackUrl=/dashboard');
    }

    // 2. Fetch User and Token Info
    let decryptedApiKey: string | null = null;
    let apiError: string | null = null;
    let accounts: UpAccountResource[] = [];
    let transactions: UpTransactionResource[] = [];
    let totalBalance = 0;

    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { encryptedUpToken: true, upTokenIv: true, upTokenAuthTag: true }
        });

        if (!user) {
            throw new Error("User not found in database."); // Should not happen if session is valid
        }

        // 3. Check if token exists and decrypt it
        if (user.encryptedUpToken && user.upTokenIv && user.upTokenAuthTag) {
            decryptedApiKey = decryptToken({
                encryptedToken: user.encryptedUpToken,
                iv: user.upTokenIv,
                authTag: user.upTokenAuthTag
            });

            if (!decryptedApiKey) {
                // Decryption failed (e.g., bad key, tampered data)
                apiError = "Failed to decrypt your API token. Please re-enter it in Settings.";
            }
        } else {
            // Token not configured
            return (
                <main className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
                    <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
                    <MissingTokenPrompt />
                </main>
            );
        }

        // 4. Fetch Data from Up API if token is valid
        if (decryptedApiKey) {
            // Use Promise.all to fetch concurrently
            const [accountsResponse, transactionsResponse] = await Promise.all([
                getUpAccounts(decryptedApiKey),
                getUpTransactions(decryptedApiKey, 25) // Fetch last 25 transactions
            ]);

            accounts = accountsResponse.data;
            transactions = transactionsResponse.data;

            // 5. Calculate Total Balance
            totalBalance = accounts.reduce((sum, account) => sum + account.attributes.balance.valueInBaseUnits, 0);
        }

    } catch (error: any) {
        console.error("Error loading dashboard data:", error);
        apiError = error.message || "An unexpected error occurred while loading dashboard data.";
        // If the error suggests an invalid token (e.g., 401 Unauthorized from API), guide the user
        if (error.message?.includes("401")) {
             apiError = "Your Up Banking token seems invalid or expired. Please update it in Settings.";
        }
    }

    // --- Render the Dashboard ---
    return (
        <main className="container mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

            {/* Display API errors or missing token prompts */}
            {apiError && !decryptedApiKey && <MissingTokenPrompt />}
            {apiError && decryptedApiKey && <ApiErrorDisplay message={apiError} />}

            {/* Display data only if token was decrypted and no API errors occurred during fetch */}
            {decryptedApiKey && !apiError && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 mb-6">
                    {/* Span across more columns on larger screens if needed */}
                     <TotalBalanceCard totalBalance={totalBalance} />
                     {/* Add more summary cards here if desired */}
                </div>
            )}

             {decryptedApiKey && !apiError && accounts.length > 0 && (
                 <div className="mb-6">
                     <AccountsCard accounts={accounts} />
                 </div>
             )}

             {decryptedApiKey && !apiError && (
                 <div className="mb-6">
                     <TransactionsTable transactions={transactions} />
                 </div>
             )}

             {/* Optional: Add loading states via Suspense if breaking down fetches */}

        </main>
    );
}