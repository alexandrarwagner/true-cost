import type { Metadata } from "next";
import Link from "next/link";
import { copy } from "@/content/copy";

export const metadata: Metadata = { title: `${copy.privacy.title} · ${copy.siteName}` };

export default function PrivacyPage() {
  return (
    <div className="container max-w-[900px] pt-8">
      <h1 className="text-2xl font-semibold">{copy.privacy.title}</h1>
      {copy.privacy.sections.map((s) => (
        <section key={s.heading} className="mt-6">
          <h2 className="text-lg font-semibold">{s.heading}</h2>
          {s.body.map((para) => (
            <p key={para} className="mt-2">
              {para}
            </p>
          ))}
        </section>
      ))}
      <p className="mt-8">
        <Link href="/" className="underline">
          {copy.siteName}
        </Link>
      </p>
    </div>
  );
}
