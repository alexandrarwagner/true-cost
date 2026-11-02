import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { copy } from "@/content/copy";
import { archivo, notoBengali } from "./fonts";
import "./globals.css";

// Every page renders per request so the CSP nonce from proxy.ts is fresh and applied.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: copy.siteName,
  description: copy.tagline,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`h-full ${archivo.variable} ${notoBengali.variable}`}>
      <body className="flex min-h-full flex-col bg-page font-sans text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-30 focus:rounded-field focus:bg-card focus:p-2 focus:outline focus:outline-2 focus:outline-brand"
        >
          {copy.shell.skip}
        </a>
        <SiteHeader />
        <main id="main" className="w-full flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
