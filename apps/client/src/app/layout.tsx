import { SentryInitializer } from "@chronomint/web-shared/client";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChronoMint",
  description: "Time tracking for modern teams"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <SentryInitializer />
          {children}
          <Toaster richColors closeButton position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
