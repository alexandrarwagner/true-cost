import "server-only";
import type { DataSources, FxSource } from "@/lib/adapters/types";
import { toEstimateRequests, type CompareRequest } from "@/lib/schema/compare";
import { encodeCompareShare } from "@/lib/schema/share";
import { ValidationError } from "@/lib/server/errors";
import { runEstimate, type EstimateResponse } from "./estimate";

export interface CompareResponse {
  /** One full estimate per school, in the order requested. */
  columns: EstimateResponse[];
  currency: EstimateResponse["currency"];
  demo: boolean;
  generatedAt: string;
  shareQuery: string;
}

/** Every column shares one currency, so three columns make one rate lookup, not three. */
function sharedFx(fx: FxSource): FxSource {
  const latest = new Map<string, ReturnType<FxSource["latest"]>>();
  const history = new Map<string, ReturnType<FxSource["history"]>>();
  return {
    latest(currency, signal) {
      const hit = latest.get(currency);
      if (hit) return hit;
      const p = fx.latest(currency, signal);
      latest.set(currency, p);
      return p;
    },
    history(currency, signal) {
      const hit = history.get(currency);
      if (hit) return hit;
      const p = fx.history(currency, signal);
      history.set(currency, p);
      return p;
    },
  };
}

/** Runs the ordinary estimate once per school, in parallel. Each column degrades on its own. */
export async function runCompare(
  req: CompareRequest,
  sources: DataSources,
  now = new Date(),
): Promise<CompareResponse> {
  const shared: DataSources = { ...sources, fx: sharedFx(sources.fx) };
  const columns = await Promise.all(
    toEstimateRequests(req).map((r) => runEstimate(r, shared, now)),
  );
  const first = columns[0];
  if (!first) throw new ValidationError("no_schools");
  return {
    columns,
    currency: first.currency,
    demo: first.demo,
    generatedAt: now.toISOString(),
    shareQuery: encodeCompareShare(req).toString(),
  };
}
