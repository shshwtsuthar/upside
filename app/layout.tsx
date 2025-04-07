import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/components/providers/SessionProviderWrapper"; // Importing the session wrapper
import Header from "@/components/layout/Header"; // We'll create a basic Header 
import { ThemeProvider } from "@/components/providers/ThemeProvider"; // Optional: Add ShadCN ThemeProvider if you want dark mode toggle
import { cn } from "@/lib/utils";
import { FloatingSettingsButton } from '@/components/layout/FloatingSettingsButton';

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" }); // Inter is the greatest font of all time

export const metadata: Metadata = {
  title: "Upside - Up Banking Frontend",
  description: "An open source frontend for Up banking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        {/* Wrap the entire application with the SessionProvider */}
        <SessionProviderWrapper>
           {/* Optional: ThemeProvider for ShadCN dark/light mode */}
           <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
           >
              <Header />

              <main>{children}</main>
              <FloatingSettingsButton />
            </ThemeProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}