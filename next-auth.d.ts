// upside/next-auth.d.ts

import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      hasUpToken?: boolean; // <-- ADD THIS LINE: Flag for token status
    } & DefaultSession["user"];
  }

  // Optional: Extend User if needed in callbacks (not strictly necessary for this fix)
  // interface User extends DefaultUser {
  //   hasUpToken?: boolean; // Example if needed elsewhere
  // }
}

// Extend the built-in JWT types
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    hasUpToken?: boolean; // <-- ADD THIS LINE: Mirror in JWT if useful
  }
}