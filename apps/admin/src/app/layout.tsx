import { SentryInitializer } from "@chronomint/web-shared/client";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./globals.css";

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
