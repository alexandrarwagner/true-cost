import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { copy } from "@/content/copy";
import "./globals.css";

// Every page renders per request so the CSP nonce from proxy.ts is fresh and applied.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: copy.siteName,
  description: copy.tagline,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-white font-sans text-neutral-900">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:border focus:border-neutral-900 focus:bg-white focus:p-2"
        >
          Skip to main content
        </a>
        <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-3xl border-t border-neutral-300 px-4 py-4 text-sm">
          <p>{copy.disclaimer}</p>
          <p className="mt-1">
            <Link href="/privacy" className="underline">
              {copy.privacy.title}
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
