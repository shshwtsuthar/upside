// lib/authOptions.ts
import { type AuthOptions } from "next-auth"; // Use 'type' import if only used as type here
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from '@/lib/prisma'; // Keep prisma import

// Define and EXPORT authOptions from this central location
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
    // Keep the same callbacks as before
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { encryptedUpToken: true, upTokenIv: true, upTokenAuthTag: true }
          });
          token.hasUpToken = !!(dbUser?.encryptedUpToken && dbUser.upTokenIv && dbUser.upTokenAuthTag);
        } catch (error) {
          console.error("Error checking token status during JWT creation:", error);
          token.hasUpToken = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token?.id) {
        session.user.id = token.id as string;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { encryptedUpToken: true, upTokenIv: true, upTokenAuthTag: true }
          });
          session.user.hasUpToken = !!(dbUser?.encryptedUpToken && dbUser.upTokenIv && dbUser.upTokenAuthTag);
        } catch (error) {
          console.error("Error checking token status during session creation:", error);
          session.user.hasUpToken = false;
        }
      }
      if (session?.user && !session.user.hasOwnProperty('hasUpToken')) {
         session.user.hasUpToken = token.hasUpToken ?? false;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // pages: { ... } // Add pages config here if needed
};