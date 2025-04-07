"use client"; // This component needs to run on the client

import { SessionProvider } from "next-auth/react";
import React from "react";

// This component just wraps its children with the SessionProvider from next-auth
export default function SessionProviderWrapper({
  children,
}: {
  children: React.ReactNode; // Type for the children prop
}) {
  // The SessionProvider makes the session data available via React Context
  return <SessionProvider>{children}</SessionProvider>;
}