import { BRAND_NAME, BRAND_TAGLINE } from "@kloqra/contracts";
import { SentryInitializer } from "@kloqra/web-shared/client";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { inter } from "@/lib/font";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND_NAME} Admin`,
  description: BRAND_TAGLINE
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
