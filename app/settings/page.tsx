"use client"; // This page needs client-side interactivity (hooks, fetch)

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation'; // Use App Router's router
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner"; // Import toast from sonner (make sure Sonner's Toaster is in layout.tsx)
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // To show feedback
import { Terminal } from 'lucide-react'; // Icon for Alert

export default function SettingsPage() {
  const { data: session, status } = useSession(); // Get session status and data
  const router = useRouter(); // For redirection
  const [upToken, setUpToken] = useState(''); // State for the token input field
  const [isLoading, setIsLoading] = useState(false); // State for loading indicators
  const [hasTokenConfigured, setHasTokenConfigured] = useState<boolean | null>(null); // Track if token exists (optional)

  // --- Optional: Check if token exists on page load ---
  // Possibly implement a GET /api/user/token/status later if desired.
  useEffect(() => {
    if (status === "authenticated") {
      // Placeholder: Assume we don't know initially
      // In a real app, you might fetch this status:
      // fetch('/api/user/token/status').then(res => res.json()).then(data => setHasTokenConfigured(data.hasToken));
      setHasTokenConfigured(false); // Default assumption or fetch real status
    }
  }, [status]);
  // --- End Optional Check ---


  // --- Redirect if not authenticated ---
  useEffect(() => {
    if (status === 'unauthenticated') {
      toast.error("Please sign in to access settings.");
      router.push('/api/auth/signin'); // Redirect to NextAuth sign-in page
    }
  }, [status, router]);

  // --- Handler for Saving the Token ---
  const handleSaveToken = async (event: React.FormEvent) => {
    event.preventDefault(); // Prevent default form submission if wrapped in <form>

    const trimmedToken = upToken.trim();
    if (!trimmedToken) {
      toast.error("Please enter your Up API Token.");
      return;
    }
    if (!trimmedToken.startsWith('up:yeah:')) {
      toast.error("Invalid token format. It should start with 'up:yeah:'.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/user/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: trimmedToken }), // Send token in request body
      });

      const result = await response.json();

      if (!response.ok) {
        // Use error message from backend if available, otherwise default
        throw new Error(result.error || `Failed to save token (HTTP ${response.status})`);
      }

      toast.success(result.message || "Up API Token saved successfully!");
      setUpToken(''); // Clear the input field on success
      setHasTokenConfigured(true); // Update status (optional feedback)
      // Optionally: router.refresh() // To refresh server components if needed

    } catch (error: any) {
      console.error("Error saving token:", error);
      toast.error(`Error: ${error.message}`);
      setHasTokenConfigured(false); // Revert status on error (optional feedback)
    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  };

  // --- Handler for Removing the Token ---
  const handleRemoveToken = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/token', {
        method: 'DELETE', // Send DELETE request
      });

      const result = await response.json();

       if (!response.ok) {
         throw new Error(result.error || `Failed to remove token (HTTP ${response.status})`);
       }

       toast.success(result.message || "Up API Token removed successfully.");
       setHasTokenConfigured(false); // Update status (optional feedback)
       // Optionally: router.refresh()

    } catch (error: any) {
        console.error("Error removing token:", error);
        toast.error(`Error: ${error.message}`);
        setHasTokenConfigured(true); // Revert status on error (optional feedback)
    } finally {
       setIsLoading(false); // Stop loading indicator
    }
  };


  // --- Render Loading State ---
  // Keeping the original loading condition
  if (status === "loading" || (status === "authenticated" && hasTokenConfigured === null && false)) {
    return (
      <main className="container mx-auto max-w-2xl p-4 md:p-6 lg:p-8">
        <div className="space-y-4">
           <Skeleton className="h-8 w-1/3" /> {/* Title Skeleton */}
           <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/2 mb-2" /> {/* Card Title Skeleton */}
                <Skeleton className="h-4 w-full" /> {/* Description Skeleton */}
                 <Skeleton className="h-4 w-3/4" /> {/* Description Skeleton */}
              </CardHeader>
              {/* Add spacing to Skeleton CardContent */}
              <CardContent className="mt-4">
                 <Skeleton className="h-4 w-1/4 mb-2" /> {/* Label Skeleton */}
                 <Skeleton className="h-10 w-full" /> {/* Input Skeleton */}
              </CardContent>
              {/* Add spacing to Skeleton CardFooter */}
              <CardFooter className="flex justify-between mt-6">
                  <Skeleton className="h-10 w-24" /> {/* Button Skeleton */}
                  <Skeleton className="h-10 w-24" /> {/* Button Skeleton */}
              </CardFooter>
           </Card>
        </div>
      </main>
    );
  }

  // --- Render if Unauthenticated ---
   if (status === "unauthenticated") {
      // Or show a specific "Please log in" message here
      return <main className="container mx-auto p-4"><p>Redirecting to sign in...</p></main>;
   }


  // --- Render Authenticated View ---
  return (
    <main className="container mx-auto max-w-2xl p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {/* Optional: Display a message based on token status */}
      {hasTokenConfigured === true && (
         <Alert variant="default" className="mb-6 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
           <Terminal className="h-4 w-4 stroke-green-600 dark:stroke-green-400" />
           <AlertTitle className="text-green-800 dark:text-green-300">Status</AlertTitle>
           <AlertDescription className="text-green-700 dark:text-green-400">
              An Up Banking API token seems to be configured for your account. You can replace it below or remove it.
           </AlertDescription>
         </Alert>
      )}
      {/* Keeping the original Action Required alert */}
       {hasTokenConfigured === false && (
         <Alert variant="destructive" className="mb-6 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
           <Terminal className="h-4 w-4 stroke-yellow-600 dark:stroke-yellow-400" />
           <AlertTitle className="text-yellow-800 dark:text-yellow-300">Action Required</AlertTitle>
           <AlertDescription className="text-yellow-700 dark:text-yellow-400">
              Please connect your Up Banking account by providing your Personal Access Token below.
           </AlertDescription>
         </Alert>
      )}


      {/* Form Card */}
      <Card>
        {/* Use onSubmit on the form if you prefer */}
        <form onSubmit={handleSaveToken}>
          <CardHeader>
            <CardTitle>Connect Up Banking</CardTitle>
            <CardDescription>
              Generate a Personal Access Token with <code className='font-mono text-sm'>transactions:read</code> and <code className='font-mono text-sm'>accounts:read</code> scopes (and others as needed) from{' '}
              <a href="https://developer.up.com.au/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                developer.up.com.au
              </a>.
              This token will be stored securely encrypted on our server.
            </CardDescription>
          </CardHeader>

          {/* ===== Added margin-top here ===== */}
          <CardContent className="mt-4"> {/* Adjust value (e.g., mt-6) if more space is needed */}
            <div className="grid w-full items-center gap-4 space-y-1.5">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="api-token">Up Personal Access Token</Label>
                <Input
                  id="api-token"
                  type="password" // Use password type to hide the token
                  placeholder="Paste your token here (up:yeah:...)"
                  value={upToken}
                  onChange={(e) => setUpToken(e.target.value)}
                  disabled={isLoading} // Disable input while loading
                  required // Make input required by HTML5
                  className="font-mono" // Use monospace font for tokens
                />
              </div>
            </div>
          </CardContent>

          {/* ===== Added margin-top here ===== */}
          <CardFooter className="flex justify-between gap-4 mt-6"> {/* Adjust value (e.g., mt-4) if needed */}
            {/* Remove Button */}
            <Button
              variant="destructive"
              type="button" // Important: type="button" prevents form submission
              onClick={handleRemoveToken}
              // Keeping original disabled logic
              disabled={isLoading /* || !hasTokenConfigured */}
            >
              {isLoading ? 'Processing...' : 'Remove Token'}
            </Button>
            {/* Save Button */}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Token'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}