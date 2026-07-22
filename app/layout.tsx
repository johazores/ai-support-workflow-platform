import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { isClerkConfigured } from "@/features/auth/services/clerk-config";

import "./globals.css";

export const metadata: Metadata = {
  title: "AI Support Workflow Platform",
  description: "AI-powered support and workflow automation platform",
};

function ApplicationProviders({ children }: { children: React.ReactNode }) {
  const content = (
    <ThemeProvider>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );

  return isClerkConfigured() ? <ClerkProvider>{content}</ClerkProvider> : content;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <ApplicationProviders>{children}</ApplicationProviders>
      </body>
    </html>
  );
}
