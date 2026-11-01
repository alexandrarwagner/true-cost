import Link from "next/link";
import { copy } from "@/content/copy";

/** Wordmark, the methodology link and the call to action. Sticky, so it stays reachable. */
export function SiteHeader() {
  const t = copy.shell;
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-page/85 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          {copy.siteName}
        </Link>
        <nav aria-label={t.nav}>
          <ul className="flex items-center gap-4">
            <li className="hidden sm:block">
              <Link href="/#how" className="underline-offset-4 hover:underline">
                {t.how}
              </Link>
            </li>
            <li>
              <Link
                href="/#estimate"
                className="inline-block rounded-pill bg-dark px-4 py-2 text-sm font-medium text-white hover:bg-ink focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand"
              >
                {t.cta}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
