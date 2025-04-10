// components/prompts/LoginPrompt.tsx
"use client";

import React from 'react';
import { signIn } from 'next-auth/react'; // Use client-side signIn for button
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';

export function LoginPrompt() {
    return (
        <div className="flex min-h-[calc(100vh-theme(space.14))] items-center justify-center p-4"> {/* Adjust min-h if header height changes */}
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-center text-2xl">Welcome to Upside</CardTitle>
                    <CardDescription className="text-center">
                        Your enhanced view for Up Banking.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                     <p className="text-sm text-muted-foreground">Please sign in to continue.</p>
                     <Button onClick={() => signIn('google')} className="w-full">
                        <LogIn className="mr-2 h-4 w-4" /> Sign in with Google
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}