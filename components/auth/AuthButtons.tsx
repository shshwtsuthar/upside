"use client"; // This component interacts with client-side hooks

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { LogIn, LogOut, Settings, User as UserIcon } from "lucide-react"; // Import icons

export function AuthButtons() {
  // useSession hook provides session data and status
  const { data: session, status } = useSession();

  // Handle loading state
  if (status === "loading") {
    // Show skeletons while session is loading
    return (
      <div className="flex items-center space-x-4">
         <Skeleton className="h-8 w-[120px]" /> {/* Skeleton for button */}
        <Skeleton className="h-8 w-8 rounded-full" /> {/* Skeleton for avatar */}
      </div>
    );
  }

  // If user is logged in (session exists)
  if (session) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Button wrapping the Avatar */}
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9 border">
              {/* Display user image if available */}
              <AvatarImage
                  src={session.user?.image ?? undefined}
                  alt={session.user?.name ?? session.user?.email ?? "User"}
              />
              {/* Fallback initials if no image */}
              <AvatarFallback>
                 {session.user?.name?.[0]?.toUpperCase() ?? session.user?.email?.[0]?.toUpperCase() ?? <UserIcon size={16} />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          {/* Display user name and email */}
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none truncate">
                {session.user?.name ?? "User"}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {session.user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Link to Settings Page */}
           <DropdownMenuItem asChild>
             <Link href="/settings" className="flex items-center cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
             </Link>
           </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Logout Button */}
          <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50">
             <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // If user is not logged in
  return (
    // Pass the provider ID ('google') to signIn
    <Button onClick={() => signIn("google")} variant="outline">
       <LogIn className="mr-2 h-4 w-4" />
      Sign in with Google
    </Button>
  );
}