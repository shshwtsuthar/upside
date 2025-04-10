// components/layout/Header.tsx
"use client";

import Link from 'next/link';
import React from 'react';
import { AuthButtons } from '../auth/AuthButtons';
import { ModeToggle } from '../ui/mode-toggle';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const Header = () => {
  const { data: session, status } = useSession();
  const pathname = usePathname(); // Get current path

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Apply padding directly, control max-width, center, and justify-between */}
      {/* Adjust px values (px-4, sm:px-6 etc.) and max-w-* as needed */}
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Left Group: Logo, Title, Nav */}
        <div className="flex items-center space-x-4 md:space-x-6">
          <Link href="/" className="flex items-center space-x-2">
            <img src="/UP_STROKE_LOGO.svg" alt="Up Logo" className="h-6 w-auto" />
            <span className="hidden font-bold sm:inline-block">Upside</span>
          </Link>

          {/* Conditional Navigation (Only show if logged in) */}
          {status === 'authenticated' && (
            // Added space-x-4 here to space out nav items
            <nav className="flex items-center space-x-4">
              {/* Dashboard Link */}
              <Link
                href="/dashboard"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === '/dashboard'
                    ? "text-primary" // Active style
                    : "text-muted-foreground" // Inactive style
                )}
              >
                Dashboard
              </Link>

              {/* Settings Link - Added */}
              <Link
                href="/settings"
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === '/settings'
                    ? "text-primary" // Active style
                    : "text-muted-foreground" // Inactive style
                )}
              >
                Settings
              </Link>
              {/* Add other nav links here if needed */}
            </nav>
          )}
        </div>

        {/* Right Group: Theme Toggle, Auth Buttons */}
        <div className="flex items-center space-x-2">
          <ModeToggle />
          <AuthButtons />
        </div>

      </div>
    </header>
  );
};

export default Header;