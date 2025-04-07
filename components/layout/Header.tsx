import Link from 'next/link';
import React from 'react';
import { AuthButtons } from '../auth/AuthButtons'; // Import the AuthButtons
import { ModeToggle } from '../ui/mode-toggle'; // Optional: if using ThemeProvider

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo/Brand Name */}
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            {/* You can add an SVG logo here */}
            <span className="font-bold">Upside</span>
          </Link>
          {/* Optional: Add navigation links here */}
          {/* <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link href="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">Dashboard</Link>
          </nav> */}
        </div>

        {/* Right side items */}
        <div className="flex flex-1 items-center justify-end space-x-2">
           {/* Optional: Theme Toggle */}
           <ModeToggle />
          {/* Authentication Buttons */}
          <AuthButtons />
        </div>
      </div>
    </header>
  );
};

export default Header;