// upside/app/api/auth/[...nextauth]/route.ts

import NextAuth, { type AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from '@/lib/prisma';

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, profile, isNewUser }) {
      // On initial sign in, 'user' object is present
      if (user?.id) {
        token.id = user.id;
        // Check DB for token status when JWT is first created (or account linked)
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { encryptedUpToken: true, upTokenIv: true, upTokenAuthTag: true }
          });
          token.hasUpToken = !!(dbUser?.encryptedUpToken && dbUser.upTokenIv && dbUser.upTokenAuthTag);
        } catch (error) {
          console.error("Error checking token status during JWT creation:", error);
          token.hasUpToken = false; // Default to false on error
        }
      }
      // For subsequent JWT updates, the token already has the ID.
      // We *could* re-check the DB here on every JWT update, but it might be excessive.
      // Relying on the session callback to do the check is usually sufficient for the client.
      // However, if server-side actions relying *only* on the JWT need this, re-enable the check:
      /*
      else if (token.id && !token.hasOwnProperty('hasUpToken')) { // Check only if not already set
         try {
           const dbUser = await prisma.user.findUnique({
             where: { id: token.id as string },
             select: { encryptedUpToken: true, upTokenIv: true, upTokenAuthTag: true }
           });
           token.hasUpToken = !!(dbUser?.encryptedUpToken && dbUser.upTokenIv && dbUser.upTokenAuthTag);
         } catch (error) {
           console.error("Error checking token status during JWT update:", error);
           token.hasUpToken = false;
         }
      }
      */
      return token;
    },

    async session({ session, token }) {
      if (session?.user && token?.id) {
        session.user.id = token.id as string;

        // Fetch latest token status from DB when session is requested
        // This ensures the client always gets the current status
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { encryptedUpToken: true, upTokenIv: true, upTokenAuthTag: true }
          });
          // Set the flag based on whether all parts exist
          session.user.hasUpToken = !!(dbUser?.encryptedUpToken && dbUser.upTokenIv && dbUser.upTokenAuthTag);
        } catch (error) {
          console.error("Error checking token status during session creation:", error);
          session.user.hasUpToken = false; // Default to false on error
        }

      }
      // Fallback if token somehow doesn't have hasUpToken (e.g., old token)
      if (session?.user && !session.user.hasOwnProperty('hasUpToken')) {
         session.user.hasUpToken = token.hasUpToken ?? false; // Use JWT value or default false
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // ... pages config (optional) ...
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };