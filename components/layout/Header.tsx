// components/layout/Header.tsx

"use client"; 

import Link from 'next/link';
import React from 'react';
import { AuthButtons } from '../auth/AuthButtons';
import { ModeToggle } from '../ui/mode-toggle';
import { useSession } from 'next-auth/react'; // Import useSession hook

const Header = () => {
  const { data: session, status } = useSession(); // Get session status client-side

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo/Brand Name */}
        <div className="flex items-center"> {/* Adjusted flex container */}
          <Link href="/" className="mr-6 flex items-center space-x-2">
            {/* Consider optimizing image loading if needed */}
            <img src="/UP_STROKE_LOGO.svg" alt="Up Logo" className="h-6 w-auto" />
            <span className="font-bold">Upside</span>
          </Link>

          {/* Navigation Links - Show Dashboard link if logged in */}
          {status === 'authenticated' && (
            <nav className="flex items-center space-x-4 ml-6">
                <Link href="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                    Dashboard
                </Link>
                 {/* Add other navigation links here */}
            </nav>
           )}
        </div>

        {/* Right side items */}
        <div className="flex flex-1 items-center justify-end space-x-2">
           <ModeToggle />
          <AuthButtons />
        </div>
      </div>
    </header>
  );
};

export default Header;