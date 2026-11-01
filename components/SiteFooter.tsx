import Link from "next/link";
import { copy } from "@/content/copy";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="font-semibold text-ink">{copy.siteName}</p>
        <p>{copy.shell.footerLine}</p>
        <p>
          <Link href="/privacy" className="underline">
            {copy.privacy.title}
          </Link>
        </p>
      </div>
      <p className="mx-auto max-w-[1200px] px-4 pb-6 text-xs text-muted sm:px-6 lg:px-8">
        {copy.disclaimer}
      </p>
    </footer>
  );
}
