import type { Metadata } from "next";
import Link from "next/link";
import { CompareView } from "@/components/CompareView";
import { ResultView } from "@/components/ResultView";
import { copy } from "@/content/copy";
import { decodeCompareShare, decodeShare } from "@/lib/schema/share";
import { flags } from "@/lib/server/flags";
import { buildSources, exampleSources } from "@/lib/server/sources";
import { runCompare } from "@/services/compare";
import { runEstimate } from "@/services/estimate";

export const metadata: Metadata = { title: `${copy.result.heading} · ${copy.siteName}` };

function Frame({
  title,
  shareQuery,
  children,
}: React.PropsWithChildren<{ title: string; shareQuery: string }>) {
  return (
    <div className="container pt-8">
      <h1 className="text-2xl font-semibold">{copy.siteName}</h1>
      <p className="mt-1 mb-6">
        {title} ·{" "}
        <Link href={`/react?${shareQuery}`} className="underline print:hidden">
          {copy.result.edit}
        </Link>
      </p>
      {children}
    </div>
  );
}

// A shared result, rendered on the server from the inputs in the URL. Works without JavaScript:
// the chart is replaced by its table and the slider is simply absent. A comparison link (s2, s3)
// renders the side-by-side table when COMPARE_ENABLED, and the first school alone otherwise.
export default async function SharedResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") params.set(k, v);
  const { COMPARE_ENABLED } = flags();
  const compare = COMPARE_ENABLED ? decodeCompareShare(params) : null;
  if (compare) {
    const response = await runCompare(compare, buildSources());
    const names = compare.schools.map((s) => s.school.name).join(" · ");
    return (
      <Frame title={names} shareQuery={response.shareQuery}>
        <CompareView response={response} />
      </Frame>
    );
  }
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
  const response = await runEstimate(req, req.example ? exampleSources() : buildSources());
  return (
    <Frame title={req.school.name} shareQuery={response.shareQuery}>
      <ResultView editHref={`/react?${response.shareQuery}`} response={response} />
    </Frame>
  );
}
