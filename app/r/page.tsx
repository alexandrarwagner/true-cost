import type { Metadata } from "next";
import Link from "next/link";
import { ResultView } from "@/components/ResultView";
import { copy } from "@/content/copy";
import { decodeShare } from "@/lib/schema/share";
import { buildSources } from "@/lib/server/sources";
import { runEstimate } from "@/services/estimate";

export const metadata: Metadata = { title: `${copy.result.heading} · ${copy.siteName}` };

// A shared result, rendered on the server from the inputs in the URL. Works without JavaScript:
// the chart is replaced by its table and the slider is simply absent.
export default async function SharedResultPage({
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
      <>
        <h1 className="text-2xl font-semibold">{copy.siteName}</h1>
        <p className="mt-4">{copy.result.notFound}</p>
        <p className="mt-2">
          <Link href="/" className="underline">
            {copy.result.startOver}
          </Link>
        </p>
      </>
    );
  }
  const response = await runEstimate(req, buildSources());
  return (
    <>
      <h1 className="text-2xl font-semibold">{copy.siteName}</h1>
      <p className="mt-1 mb-6">
        {req.school.name} ·{" "}
        <Link href={`/?${response.shareQuery}`} className="underline print:hidden">
          {copy.result.edit}
        </Link>
      </p>
      <ResultView response={response} />
    </>
  );
}
