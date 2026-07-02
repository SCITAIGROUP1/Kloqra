import { BRAND_NAME } from "@kloqra/contracts";
import { Providers } from "@kloqra/web-shared";
import { SentryInitializer } from "@kloqra/web-shared/client";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import { inter } from "@/lib/font";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND_NAME} Platform`,
  description: "Internal platform administration",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <SentryInitializer />
          {children}
          <Toaster richColors closeButton position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
