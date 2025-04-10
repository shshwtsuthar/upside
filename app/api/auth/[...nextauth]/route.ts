// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
// Remove local imports for providers, adapter, prisma if only used in authOptions
// import GoogleProvider from "next-auth/providers/google";
// import { PrismaAdapter } from "@next-auth/prisma-adapter";
// import prisma from '@/lib/prisma';

// Import the shared authOptions
import { authOptions } from "@/lib/authOptions"; // <-- Import from new location

// Initialize NextAuth.js with the imported options
const handler = NextAuth(authOptions);

// Export the handler for both GET and POST requests
export { handler as GET, handler as POST };