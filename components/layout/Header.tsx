// components/layout/Header.tsx
"use client";

import Link from 'next/link';
import React from 'react';
import { AuthButtons } from '../auth/AuthButtons';
import { ModeToggle } from '../ui/mode-toggle';
import { useSession } from 'next-auth/react';

const Header = () => {
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Apply padding directly here, control max-width, and center */}
      {/* Adjust px values (px-4, sm:px-6 etc.) to match the desired spacing */}
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Left Group: Logo, Title, Nav */}
        <div className="flex items-center space-x-4 md:space-x-6">
          <Link href="/" className="flex items-center space-x-2">
            <img src="/UP_STROKE_LOGO.svg" alt="Up Logo" className="h-6 w-auto" />
            <span className="hidden font-bold sm:inline-block">Upside</span>
          </Link>

          {status === 'authenticated' && (
            <nav className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                Dashboard
              </Link>
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