import { EstimateFlow } from "@/components/EstimateFlow";
import { Hero } from "@/components/Hero";
import { Methodology } from "@/components/Methodology";
import { toEstimateRequests } from "@/lib/schema/compare";
import { decodeCompareShare, decodeShare } from "@/lib/schema/share";
import { flags } from "@/lib/server/flags";
import { buildSources, exampleSources } from "@/lib/server/sources";
import { runCompare } from "@/services/compare";
import { runEstimate } from "@/services/estimate";

// A shared link can be edited: /?c=IN&... prefills the form, decoded on the server, and its
// result is rendered straight away so a reload keeps what was on screen. With COMPARE_ENABLED,
// the extra schools in a comparison link (s2, s3) prefill too.
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
  const initialResult = compare
    ? { kind: "compare" as const, data: await runCompare(compare, buildSources()) }
    : initial
      ? {
          kind: "single" as const,
          data: await runEstimate(initial, initial.example ? exampleSources() : buildSources()),
        }
      : null;
  return (
    <div className="pb-10">
      <Hero />
      <EstimateFlow
        initial={initial}
        initialExtras={compare ? compare.schools.slice(1) : []}
        initialResult={initialResult}
        aiEnabled={AI_ENABLED}
        compareEnabled={COMPARE_ENABLED}
      />
      <Methodology />
    </div>
  );
}
