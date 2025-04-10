// components/prompts/ConfigureTokenPrompt.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Settings } from 'lucide-react';
import Link from 'next/link';

// This can be a Server Component as it has no client interactivity
export function ConfigureTokenPrompt() {
    return (
         <div className="container mx-auto max-w-xl p-4 md:p-6 lg:p-8 mt-10"> {/* Added margin-top */}
            <Card className="w-full border-yellow-500 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30">
                 <CardHeader className="flex-row items-center gap-3 space-y-0"> {/* Flex row for icon */}
                     <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    <CardTitle className="text-yellow-800 dark:text-yellow-300">Configuration Needed</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription className="text-yellow-700 dark:text-yellow-400">
                        You're logged in, but your Up Banking Personal Access Token isn't configured yet. Please add it on the settings page to view your dashboard and data.
                    </CardDescription>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="default" className='bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white dark:text-yellow-950'>
                        <Link href="/settings">
                            <Settings className="mr-2 h-4 w-4" /> Go to Settings
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}