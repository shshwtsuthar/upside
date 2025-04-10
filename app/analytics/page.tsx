// app/analytics/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from 'next/navigation';
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/crypto";
import {
    getAllUpTransactionsForDateRange,
    getUpCategories,
    formatCurrency
} from "@/lib/up-api";
import {
    UpTransactionResource,
    UpCategoryResource,
} from "@/lib/up-api-types";
import { format } from 'date-fns';

// Import UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Ban, PieChart as PieChartIcon, BarChartHorizontal } from "lucide-react";

// Import Client Components AND their expected data types
import { SpendingCategoryChart, ProcessedCategoryData } from "@/components/analytics/SpendingCategoryChart";
import { IncomeSpendingTrendChart, ProcessedTrendDataPoint } from "@/components/analytics/IncomeSpendingTrendChart";
import { ChartConfig } from "@/components/ui/chart";

// Chart color variables
const chartColorVars = [ "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)" ];

// --- Helper Functions (processCategoryData, processTrendData - remain the same) ---
function processCategoryData(
    transactions: UpTransactionResource[],
    categories: UpCategoryResource[]
): { chartData: ProcessedCategoryData[], chartConfig: ChartConfig, totalSpending: number } {
    const spendingByCategory: { [key: string]: number } = {};
    let totalSpending = 0;
    transactions.forEach((tx) => { if (tx.attributes.amount.valueInBaseUnits < 0) { const catId = tx.relationships.category?.data?.id ?? "Uncategorized"; const abs = Math.abs(tx.attributes.amount.valueInBaseUnits); spendingByCategory[catId]=(spendingByCategory[catId]||0)+abs; totalSpending+=abs; }});
    const categoryNameMap = new Map<string, string>(categories.map(cat => [cat.id, cat.attributes.name]));
    categoryNameMap.set("Uncategorized", "Uncategorized");
    const sortedData = Object.entries(spendingByCategory).map(([id, value])=>({id, name: categoryNameMap.get(id)??id, value})).sort((a,b)=>b.value-a.value);
    const finalChartData: ProcessedCategoryData[] = [];
    const dynamicChartConfig: ChartConfig = {};
    sortedData.forEach((item, index) => { const c=chartColorVars[index % chartColorVars.length]; finalChartData.push({categoryId:item.id, categoryName:item.name, spending:item.value}); dynamicChartConfig[item.id]={label:item.name, color:c}; });
    return { chartData: finalChartData, chartConfig: dynamicChartConfig, totalSpending };
}
function processTrendData(
    transactions: UpTransactionResource[],
    periodStartDate: Date,
): ProcessedTrendDataPoint[] {
    const aggregates: { income: number, spending: number } = { income: 0, spending: 0 };
    transactions.forEach((tx) => { const a=tx.attributes.amount.valueInBaseUnits; if(a>0){aggregates.income+=a;}else if(a<0){aggregates.spending+=Math.abs(a);} });
    return [{ month: format(periodStartDate, 'MMM'), income: aggregates.income, spending: aggregates.spending }];
}
const trendChartConfig = { income: { label: "Income", color: "hsl(var(--chart-2))" }, spending: { label: "Spending", color: "hsl(var(--chart-1))" }, } satisfies ChartConfig;


// --- Main Analytics Page Component ---
export default async function AnalyticsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect('/api/auth/signin?callbackUrl=/analytics');

    // Date range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

    // Initialize variables
    let decryptedApiKey: string | null = null;
    let transactions: UpTransactionResource[] = [];
    let categories: UpCategoryResource[] = [];
    let apiError: string | null = null;
    let isLoading = true; // Start loading
    let categoryChartData: ProcessedCategoryData[] = [];
    let categoryChartConfig: ChartConfig = {};
    let totalSpending = 0;
    let trendChartData: ProcessedTrendDataPoint[] = [];
    let processingError: string | null = null;

    try {
        // --- Get User & Decrypt Token ---
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { encryptedUpToken: true, upTokenIv: true, upTokenAuthTag: true } // Ensure fields are selected
        });

        if (!user?.encryptedUpToken || !user.upTokenIv || !user.upTokenAuthTag) {
            apiError = "Token Required: Please configure your Up Banking token in Settings.";
            // Skip fetching if token is missing
        } else {
            decryptedApiKey = decryptToken({
                encryptedToken: user.encryptedUpToken, // Pass correct fields
                iv: user.upTokenIv,
                authTag: user.upTokenAuthTag
            });

            if (!decryptedApiKey) {
                // If decryption fails, set error and skip fetching
                throw new Error("Failed to decrypt token.");
            }

            // --- Fetch Data (only if token was decrypted) ---
            const results = await Promise.allSettled([ // Correctly call the functions
                getAllUpTransactionsForDateRange(decryptedApiKey, startDate, endDate),
                getUpCategories(decryptedApiKey)
            ]);

            // Correctly destructure results
            const [transactionsResult, categoriesResult] = results;

            // Process fetch results safely
            if (transactionsResult?.status === 'fulfilled') {
                transactions = transactionsResult.value;
            } else {
                console.error("Failed to fetch transactions:", transactionsResult?.reason);
                apiError = `Failed to load transaction data: ${transactionsResult?.reason?.message ?? 'Unknown error'}`;
            }

            if (categoriesResult?.status === 'fulfilled') {
                 // Check if .data exists before assigning
                 categories = categoriesResult.value?.data ?? [];
                 if (!categoriesResult.value?.data) {
                    console.warn("Categories response structure might be unexpected:", categoriesResult.value);
                 }
            } else {
                console.error("Failed to fetch categories:", categoriesResult?.reason);
                const catError = `Failed to load category data: ${categoriesResult?.reason?.message ?? 'Unknown error'}`;
                apiError = apiError ? `${apiError}. ${catError}` : catError;
            }
        }
    } catch (error: any) {
        console.error("Error during fetch/decrypt:", error);
        apiError = apiError || error.message || "An unexpected error occurred."; // Preserve specific token error
    } finally {
        isLoading = false; // Done loading/fetching attempt
    }

    // --- Process Data (only if fetch was successful) ---
    if (!isLoading && !apiError) {
        if (transactions.length > 0) {
            if (categories.length > 0) {
                try {
                    const d = processCategoryData(transactions, categories);
                    categoryChartData = d.chartData;
                    categoryChartConfig = d.chartConfig;
                    totalSpending = d.totalSpending;
                } catch (e) { processingError="Error processing category data"; console.error(e); }
            } else { processingError="Categories missing, labels may be incorrect."; } // Set error if categories failed
            try {
                trendChartData = processTrendData(transactions, startDate);
            } catch (e) {
                const trendError = "Error processing trend data.";
                processingError = processingError ? `${processingError} ${trendError}` : trendError; console.error(e);
            }
        } else {
            console.log("No transactions found for the period.");
            // Charts will show empty state internally
        }
    }

    // --- Render Page ---
    const currentMonthStr = format(startDate, 'LLLL yyyy');

    return (
        <main className="container mx-auto max-w-6xl p-4 md:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6">Analytics</h1>
            <div className="mb-6 p-4 border rounded-lg bg-card text-muted-foreground"> {/* Filter Placeholder */}
                <p className="text-sm">Showing data for: {currentMonthStr}</p>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                    <Card>
                        <CardHeader> <Skeleton className="h-6 w-3/5" /> <Skeleton className="h-4 w-4/5 mt-1" /> </CardHeader>
                        <CardContent className="flex items-center justify-center min-h-[300px]"> <Skeleton className="h-[250px] w-[250px] rounded-full" /> </CardContent>
                    </Card>
                    <Card>
                        <CardHeader> <Skeleton className="h-6 w-3/5" /> <Skeleton className="h-4 w-4/5 mt-1" /> </CardHeader>
                        <CardContent className="min-h-[300px] space-y-3 pt-4"> <Skeleton className="h-8 w-full" /> <Skeleton className="h-8 w-full" /> <Skeleton className="h-8 w-5/6" /> </CardContent>
                    </Card>
                </div>
            )}

            {/* Error Display (API Error takes precedence) */}
            {/* Ensure Alert components have direct children or are wrapped */}
            {!isLoading && apiError && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Analytics Data</AlertTitle>
                    <AlertDescription>{apiError}</AlertDescription>
                </Alert>
            )}
            {/* Show Processing Error only if API was okay */}
            {!isLoading && !apiError && processingError && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Data Processing Issue</AlertTitle>
                    <AlertDescription>{processingError}</AlertDescription>
                </Alert>
            )}

            {/* Charts Grid (Render only if not loading and no API error) */}
            {!isLoading && !apiError && (
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                    {/* Spending By Category Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"> <PieChartIcon className="h-5 w-5 text-muted-foreground" /> Spending by Category </CardTitle>
                            <CardDescription> {currentMonthStr} {totalSpending > 0 ? ` - Total: ${formatCurrency(totalSpending)}` : ''} </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <SpendingCategoryChart
                                 chartData={categoryChartData}
                                 chartConfig={categoryChartConfig}
                             />
                        </CardContent>
                    </Card>

                    {/* Income vs Spending Trend Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"> <BarChartHorizontal className="h-5 w-5 text-muted-foreground" /> Income vs Spending </CardTitle>
                            <CardDescription>Comparison for {currentMonthStr}</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <IncomeSpendingTrendChart
                                 chartData={trendChartData}
                                 chartConfig={trendChartConfig}
                             />
                        </CardContent>
                    </Card>
                </div>
            )}
        </main>
    );
}