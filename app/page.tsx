import { EstimateFlow } from "@/components/EstimateFlow";
import { copy } from "@/content/copy";
import { toEstimateRequests } from "@/lib/schema/compare";
import { decodeCompareShare, decodeShare } from "@/lib/schema/share";
import { flags } from "@/lib/server/flags";

// A shared link can be edited: /?c=IN&... prefills the form, decoded on the server. With
// COMPARE_ENABLED, the extra schools in a comparison link (s2, s3) prefill too.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") params.set(k, v);
  const { AI_ENABLED, COMPARE_ENABLED } = flags();
  const compare = COMPARE_ENABLED ? decodeCompareShare(params) : null;
  const initial = compare ? (toEstimateRequests(compare)[0] ?? null) : decodeShare(params);
  return (
    <>
      <h1 className="text-2xl font-semibold">{copy.siteName}</h1>
      <p className="mt-1 mb-6">{copy.tagline}</p>
      <EstimateFlow
        initial={initial}
        initialExtras={compare ? compare.schools.slice(1) : []}
        aiEnabled={AI_ENABLED}
        compareEnabled={COMPARE_ENABLED}
      />
    </>
  );
}
