import { PrismaClient } from '@prisma/client';

// This prevents TypeScript errors in the global scope declaration below
declare global {
  // Use 'var' to declare a global variable that can be reassigned
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Check if we are in production or development
// If we are in development and globalThis.prisma already exists, reuse it.
// Otherwise, create a new PrismaClient instance.
const prisma = globalThis.prisma || new PrismaClient({
    // Optional: You can uncomment this to log Prisma's database queries
    // log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// In development, assign the created PrismaClient instance to the global variable.
// This ensures that during hot-reloading (common in development),
// we don't end up creating a new connection pool on every reload.
if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}

// Export the single, potentially reused PrismaClient instance
export default prisma;