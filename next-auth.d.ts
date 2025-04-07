import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

// Extend the built-in session types
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's database id. */
      id: string;
      // Add any other properties you want to make available client-side here
      // e.g., role: string;
    } & DefaultSession["user"]; // Keep the default properties like name, email, image
  }

  // Extend the built-in User model type (optional, but good practice if you add custom fields to your User model you might access in callbacks)
  // interface User extends DefaultUser {
  //   // Add custom fields from your Prisma User model here if needed in callbacks
  //   // e.g., role: string;
  // }
}

// Extend the built-in JWT types
declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT extends DefaultJWT {
    /** OpenID ID Token */
    id: string; // Add the id property to the JWT type
     // Add any other properties you added in the jwt callback here
     // e.g., role: string;
  }
}