import type { Metadata } from "next";
import Link from "next/link";
import { Breakdown } from "@/components/Breakdown";
import { copy } from "@/content/copy";
import { decodeShare } from "@/lib/schema/share";
import { getEnv } from "@/lib/server/env";
import { buildSources, exampleSources } from "@/lib/server/sources";
import { runEstimate } from "@/services/estimate";

export const metadata: Metadata = { title: `${copy.breakdown.title} · ${copy.siteName}` };

// "Your full calculation": the same share params as /r, rendered on the server, printable,
// every sentence a template filled from the engine's derivations (ADR 015).
export default async function BreakdownPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") params.set(k, v);
  const req = decodeShare(params);
  if (!req) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold">{copy.breakdown.title}</h1>
        <p className="mt-4">{copy.result.notFound}</p>
        <p className="mt-2">
          <Link href="/" className="underline">
            {copy.result.startOver}
          </Link>
        </p>
      </div>
    );
  }
  const response = await runEstimate(req, req.example ? exampleSources() : buildSources());
  return (
    <Breakdown
      response={response}
      reportUrl={getEnv().dealReportUrl}
      backHref={`/?${response.shareQuery}`}
    />
  );
}
