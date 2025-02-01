"use client"

import Image from "next/image"
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { CalendarDateRangePicker } from "@/components/dashboard/date-range-picker"
import { MainNav } from "@/components/dashboard/main-nav"
import { Overview } from "@/components/dashboard/overview"
import { RecentSales } from "@/components/dashboard/recent-sales"
import { Search } from "@/components/dashboard/search"
import { UserNav } from "@/components/dashboard/user-nav"

export function FetchBalance(){
  const apiKey = process.env.NEXT_PUBLIC_UP_API_KEY;
  const [balance, setBalance] = useState(0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Spending balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Spending Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(balance)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total spending balance
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function MonthlySummary() {
  const apiKey = process.env.NEXT_PUBLIC_UP_API_KEY;
  const [totalMoneyIn, setTotalMoneyIn] = useState(0);
  const [totalMoneyOut, setTotalMoneyOut] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTotals = async () => {
      try {
        const baseURL = "https://api.up.com.au/api/v1";
        const endpoint = "/transactions";

        // Get the current date and calculate the start and end of the month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

        // Fetch transactions for the current month
        const url = `${baseURL}${endpoint}?filter[since]=${firstDayOfMonth}&filter[until]=${lastDayOfMonth}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Calculate totals while handling pagination
        let moneyIn = 0;
        let moneyOut = 0;
        let nextPageUrl = data.links.next;
        
        // Process first page
        data.data.forEach((transaction) => {
          const amount = parseFloat(transaction.attributes.amount.value);
          if (amount > 0) {
            moneyIn += amount;
          } else {
            moneyOut += Math.abs(amount);
          }
        });

        // Handle pagination - fetch all pages
        while (nextPageUrl) {
          const nextResponse = await fetch(nextPageUrl, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          });
          
          if (!nextResponse.ok) {
            throw new Error(`HTTP error! status: ${nextResponse.status}`);
          }

          const nextData = await nextResponse.json();
          nextData.data.forEach((transaction) => {
            const amount = parseFloat(transaction.attributes.amount.value);
            if (amount > 0) {
              moneyIn += amount;
            } else {
              moneyOut += Math.abs(amount);
            }
          });
          
          nextPageUrl = nextData.links.next;
        }

        setTotalMoneyIn(moneyIn);
        setTotalMoneyOut(moneyOut);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTotals();
  }, [apiKey]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-pulse">
          <CardContent className="h-32" />
        </Card>
        <Card className="animate-pulse">
          <CardContent className="h-32" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-100 rounded-lg">
        <p>Error loading transaction data: {error}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Money In Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Money In</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totalMoneyIn)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total deposits this month
          </p>
        </CardContent>
      </Card>

      {/* Money Out Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Money Out</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(totalMoneyOut)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total spending this month
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <div className="min-h-screen w-full flex-col md:flex">
        <div className="border-b w-full sticky top-0 bg-background">
          <div className="w-full flex h-16 items-center px-4">
            <MainNav className="mx-6" />
            <div className="ml-auto flex items-center space-x-4">
              <Search />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <div className="flex items-center space-x-2">
              <CalendarDateRangePicker />
              <Button>Download</Button>
            </div>
          </div>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsContent value="overview" className="space-y-4">
              <FetchBalance/>
              <MonthlySummary/>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Spending Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <Overview />
                  </CardContent>
                </Card>
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>
                      You made 265 sales this month.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentSales />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}