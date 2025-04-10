// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/components/providers/SessionProviderWrapper";
import Header from "@/components/layout/Header"; // Keep import
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { FloatingSettingsButton } from '@/components/layout/FloatingSettingsButton';
// --- Added imports ---
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { Toaster } from "@/components/ui/sonner" // Ensure Toaster is imported

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Upside - Up Banking Frontend",
  description: "An open source frontend for Up banking.",
};

// --- Make the layout an async function ---
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // --- Fetch session server-side in the layout ---
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        <SessionProviderWrapper> {/* SessionProvider MUST wrap ThemeProvider and everything else */}
           <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
           >
              {/* --- Conditionally render Header based on session --- */}
              {session && <Header />}

              {/* Render the page content */}
              <main>{children}</main>

              {/* --- Conditionally render FloatingSettingsButton (optional) --- */}
              {session && <FloatingSettingsButton />}

              {/* --- Add Sonner Toaster for notifications --- */}
              <Toaster richColors position="top-right" />

            </ThemeProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}