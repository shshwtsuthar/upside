import NextAuth, { type AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

// Instantiate Prisma Client - ensure this happens only once ideally
// You might want to move Prisma Client instantiation to a separate lib file
// for better management, but this works for now.
const prisma = new PrismaClient();

// Define authentication options
export const authOptions: AuthOptions = {
  // Configure the Prisma adapter to use your Prisma client instance
  adapter: PrismaAdapter(prisma),

  // Configure one or more authentication providers
  providers: [
    GoogleProvider({
      // Ensure these environment variables are set in your .env file!
      clientId: process.env.GOOGLE_CLIENT_ID as string, // Type assertion as string
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, // Type assertion as string
    }),
    // You can add other providers here later (e.g., GitHub, Email)
    // GitHubProvider({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET })
  ],

  // Use JWT strategy for sessions - often better for API routes
  session: {
    strategy: "jwt",
  },

  // Callbacks are functions executed at specific points in the auth flow
  callbacks: {
    // The 'jwt' callback is called whenever a JSON Web Token is created or updated.
    // We can use it to add custom data to the token, like the user's ID from the database.
    async jwt({ token, user }) {
      // If the 'user' object exists (usually on sign in), add its ID to the token.
      if (user) {
        token.id = user.id;
         // You could potentially add more user data here if needed in the token
         // token.role = user.role; // If you had a role field in your User model
      }
      return token; // Return the modified token
    },

    // The 'session' callback is called whenever a session is checked.
    // We can use it to add custom data to the session object accessible on the client-side.
    async session({ session, token }) {
      // If the session and user exist, add the user ID (from the token) to the session's user object.
      if (session?.user) {
        session.user.id = token.id as string; // Add the id from the JWT token
         // Copy any other custom fields from the token to the session if needed
         // session.user.role = token.role;
      }
      return session; // Return the modified session object
    },
  },

  // Secret for signing cookies/JWTs - required!
  // Ensure this environment variable is set in your .env file
  secret: process.env.NEXTAUTH_SECRET,

  // Optional: Specify custom pages if needed
  // pages: {
  //   signIn: '/auth/signin', // Default NextAuth page is usually fine
  //   // signOut: '/auth/signout',
  //   // error: '/auth/error', // Error code passed in query string as ?error=
  //   // verifyRequest: '/auth/verify-request', // (used for email provider)
  //   // newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out to disable)
  // }
};

// Initialize NextAuth.js with the configured options
const handler = NextAuth(authOptions);

// Export the handler for both GET and POST requests as required by NextAuth.js
export { handler as GET, handler as POST };