"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FloatingSettingsButton() {
  const { data: session, status } = useSession();

  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  return (
    <Link
      href="/settings"
      passHref
      aria-label="Open Settings"
      className={cn(
        "fixed",
        "bottom-6",
        "left-6",
        "z-50"
      )}
    >
      <Button
        variant="outline" // Changed variant to outline (like ModeToggle)
        size="icon"     // Standard icon button size (makes it squarish)
        className="shadow-lg" // Keep shadow for visibility (optional)
      >
        {/* Adjust icon size if needed - h-4/w-4 or h-5/w-5 are common for size="icon" */}
        <Settings className="h-12 w-12" />
      </Button>
    </Link>
  );
}