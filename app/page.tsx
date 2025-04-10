// app/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { redirect } from 'next/navigation';

// Import the prompt components
import { LoginPrompt } from "@/components/prompts/LoginPrompt";
import { ConfigureTokenPrompt } from "@/components/prompts/ConfigureTokenPrompt";

// This is a Server Component
export default async function RootPage() {
  const session = await getServerSession(authOptions);

  // Scenario 1: User is NOT logged in
  if (!session?.user?.id) {
    // Render the login prompt component.
    // The layout will NOT render the header because session is null.
    return <LoginPrompt />;
  }

  // Scenario 2 & 3: User IS logged in
  // Check if the Up token is configured
  let isTokenConfigured = false;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { encryptedUpToken: true, upTokenIv: true, upTokenAuthTag: true } // Only select needed fields
    });
    // Check if all necessary token parts exist
    if (user && user.encryptedUpToken && user.upTokenIv && user.upTokenAuthTag) {
      isTokenConfigured = true;
    }
  } catch (error) {
    console.error("Error checking token configuration:", error);
    // Handle error case - perhaps show a generic error or the configure prompt as a fallback
    // For simplicity, we'll treat DB error here as "not configured" for the user flow
    isTokenConfigured = false;
  }

  // Scenario 3: Logged in AND Token IS configured
  if (isTokenConfigured) {
    // Redirect to the dashboard page. The layout WILL render the header.
    redirect('/dashboard');
    // Note: redirect() must be called outside of try/catch and before any return statement
    // It throws a special error that Next.js catches to perform the redirect.
  }

  // Scenario 2: Logged in BUT Token is NOT configured
  else {
    // Render the configure token prompt. The layout WILL render the header.
    return <ConfigureTokenPrompt />;
  }

  // This part should technically not be reached due to the logic above,
  // but returning null satisfies TypeScript if needed.
  // return null;
}