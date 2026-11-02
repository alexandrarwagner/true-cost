import Link from "next/link";
import { copy } from "@/content/copy";
import { Wordmark } from "./Wordmark";

export function SiteFooter() {
  return (
    <footer className="mt-30 border-t border-line-strong print:hidden">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-8 text-[15px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-14">
        <p className="text-ink">
          <Wordmark className="text-[22px]" />
        </p>
        <p>{copy.shell.footerLine}</p>
        <p>
          <Link href="/privacy" className="underline">
            {copy.privacy.title}
          </Link>
        </p>
      </div>
      <p className="mx-auto max-w-[1440px] px-4 pb-8 text-xs text-muted sm:px-6 lg:px-14">
        {copy.disclaimer}
      </p>
    </footer>
  );
}
