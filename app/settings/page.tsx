"use client"; // This page needs client-side interactivity (hooks, fetch)

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // Use App Router's router
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, CheckCircle, AlertCircle as AlertIcon } from 'lucide-react'; // Use different icons

export default function SettingsPage() {
  // Use 'update' function if you need to force session refresh later
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [upToken, setUpToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Initialize based on session status or null if loading
  const [hasTokenConfigured, setHasTokenConfigured] = useState<boolean | null>(
      status === 'authenticated' ? session?.user?.hasUpToken ?? null : null
  );

  // --- Effect to update state when session data changes ---
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Update local state if the session's token status is available
      setHasTokenConfigured(session.user.hasUpToken ?? null);
    } else if (status === 'unauthenticated') {
      // Handle case where session becomes unauthenticated after initial load
      setHasTokenConfigured(null);
    }
     // If status is 'loading', hasTokenConfigured remains null (handled by loading UI)
  }, [session, status]); // Rerun when session object or status changes

  // --- Redirect if becomes unauthenticated ---
  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error("Please sign in to access settings.");
      router.push('/api/auth/signin?callbackUrl=/settings'); // Redirect to sign-in
    }
  }, [status, router]);

  // --- Handler for Saving the Token ---
  const handleSaveToken = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedToken = upToken.trim();
    // ... (token validation remains the same) ...
    if (!trimmedToken || !trimmedToken.startsWith('up:yeah:')) {
       toast.error(!trimmedToken ? "Please enter your Up API Token." : "Invalid token format. It should start with 'up:yeah:'.");
       return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmedToken }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Failed to save token (HTTP ${response.status})`);

      toast.success(result.message || "Up API Token saved successfully!");
      setUpToken('');
      setHasTokenConfigured(true); // <-- Update local state immediately
      // Optionally force session refresh if other components depend on it immediately
      // await updateSession({ event: "session" }); // May cause a brief reload/update
      router.refresh(); // Refresh server components like dashboard if needed

    } catch (error: any) {
      console.error("Error saving token:", error);
      toast.error(`Error: ${error.message}`);
      // Don't assume token status failed here, it might have been configured before the error
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handler for Removing the Token ---
  const handleRemoveToken = async () => {
    // Optional: Add confirmation dialog here
    // if (!confirm("Are you sure you want to remove your Up Banking token?")) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/token', { method: 'DELETE' });
      const result = await response.json();
       if (!response.ok) throw new Error(result.error || `Failed to remove token (HTTP ${response.status})`);

       toast.success(result.message || "Up API Token removed successfully.");
       setHasTokenConfigured(false); // <-- Update local state immediately
       // Optionally force session refresh
       // await updateSession({ event: "session" });
       router.refresh(); // Refresh server components

    } catch (error: any) {
        console.error("Error removing token:", error);
        toast.error(`Error: ${error.message}`);
        // Don't assume token status is now true on error
    } finally {
       setIsLoading(false);
    }
  };


  // --- Render Loading State ---
  // Show skeleton if session is loading OR if authenticated but token status is still unknown (null)
  if (status === "loading" || (status === "authenticated" && hasTokenConfigured === null)) {
    return (
      <main className="container mx-auto max-w-2xl p-4 md:p-6 lg:p-8">
        <div className="space-y-4">
           <Skeleton className="h-8 w-1/3 mb-6" /> {/* Title Skeleton */}
           <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="mt-4">
                 <Skeleton className="h-4 w-1/4 mb-2" />
                 <Skeleton className="h-10 w-full" />
              </CardContent>
              <CardFooter className="flex justify-between mt-6">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
              </CardFooter>
           </Card>
        </div>
      </main>
    );
  }

   // --- Render if Unauthenticated (or redirecting) ---
   // This might briefly show if the redirect effect hasn't kicked in yet
   if (status === "unauthenticated") {
      return <main className="container mx-auto p-4"><p>Redirecting to sign in...</p></main>;
   }


  // --- Render Authenticated View ---
  return (
    <main className="container mx-auto max-w-2xl p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {/* Display message based on KNOWN token status */}
      {hasTokenConfigured === true && (
         <Alert variant="default" className="mb-6 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
           <CheckCircle className="h-4 w-4 stroke-green-600 dark:stroke-green-400" />
           <AlertTitle className="text-green-800 dark:text-green-300">Token Configured</AlertTitle>
           <AlertDescription className="text-green-700 dark:text-green-400">
              Your Up Banking API token is configured. You can replace it below or remove it.
           </AlertDescription>
         </Alert>
      )}
       {hasTokenConfigured === false && ( // Only show if we KNOW it's not configured
         <Alert variant="destructive" className="mb-6">
           <AlertIcon className="h-4 w-4" /> {/* Use standard destructive icon */}
           <AlertTitle>Action Required</AlertTitle>
           <AlertDescription>
              Please connect your Up Banking account by providing your Personal Access Token below.
           </AlertDescription>
         </Alert>
      )}
      {/* Note: No alert is shown if hasTokenConfigured is null (loading state handles this) */}


      {/* Form Card */}
      <Card>
        <form onSubmit={handleSaveToken}>
          <CardHeader>
            <CardTitle>Connect Up Banking</CardTitle>
            <CardDescription>
              Generate a Personal Access Token with <code className='font-mono text-sm'>transactions:read</code> and <code className='font-mono text-sm'>accounts:read</code> scopes from{' '}
              <a href="https://developer.up.com.au/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                developer.up.com.au
              </a>. This token is stored securely encrypted.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-4">
            <div className="grid w-full items-center gap-4 space-y-1.5">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="api-token">Up Personal Access Token</Label>
                <Input
                  id="api-token"
                  type="password"
                  placeholder="Paste your token here (up:yeah:...)"
                  value={upToken}
                  onChange={(e) => setUpToken(e.target.value)}
                  disabled={isLoading}
                  required
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between gap-4 mt-6">
            <Button
              variant="destructive"
              type="button"
              onClick={handleRemoveToken}
              // Only disable remove button if loading, allow removal even if no token exists (harmless)
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Remove Token'}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Token'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}