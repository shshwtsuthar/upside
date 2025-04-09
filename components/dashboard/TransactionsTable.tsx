// components/dashboard/TransactionsTable.tsx
import React from 'react';
import { UpTransactionResource } from '@/lib/up-api-types';
import { formatCurrency } from "@/lib/up-api"; // Assuming formatCurrency is in up-api.ts
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Interface for the component props
interface TransactionsTableProps {
    transactions: UpTransactionResource[];
}

// Define and export the component
export function TransactionsTable({ transactions }: TransactionsTableProps) {
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
                                    {/* You might want to fetch/map category names later */}
                                    {tx.relationships.category?.data?.id ?? 'Uncategorized'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {/* Consider formatting the date more nicely */}
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