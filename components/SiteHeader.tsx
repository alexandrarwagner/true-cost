import Link from "next/link";
import { copy } from "@/content/copy";
import { Wordmark } from "./Wordmark";

/** Wordmark, the methodology link and the call to action. Sticky, so it stays reachable. */
export function SiteHeader() {
  const t = copy.shell;
  return (
    <header className="sticky top-0 z-20 border-b border-ink/5 bg-page/85 backdrop-blur-[14px] print:hidden">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-14">
        <Link href="/" aria-label={copy.siteName}>
          <Wordmark />
        </Link>
        <div id="header-slot" className="peer flex min-w-0 flex-1 justify-end overflow-hidden" />
        <nav aria-label={t.nav} className="peer-[:not(:empty)]:hidden">
          <ul className="flex items-center gap-4">
            <li className="hidden sm:block">
              <Link href="/#how" className="underline-offset-4 hover:underline">
                {t.how}
              </Link>
            </li>
            <li>
              <Link
                href="/#calc"
                className="inline-flex h-11 items-center rounded-pill bg-dark px-5 text-[15px] text-white hover:bg-ink"
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
