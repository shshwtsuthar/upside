// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Declare a variable to hold the client instance within this module's scope
let prismaInstance: PrismaClient | null = null;

// Export the function to get the Prisma client instance
export const getPrismaInstance = (): PrismaClient => {
  if (!prismaInstance) {
    console.log("Creating new PrismaClient instance..."); // Log instance creation
    prismaInstance = new PrismaClient({
      // Optional: Configure logging based on environment
      // log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
    });
  }
  // console.log("Returning existing PrismaClient instance..."); // Optional log
  return prismaInstance;
};

// --- Do NOT export a default instance anymore ---
// const prisma = getPrismaInstance(); // Remove this line
// export default prisma; // Remove this line