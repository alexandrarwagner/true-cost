"use client";

import { useRef, useState } from "react";
import { copy } from "@/content/copy";
import { ApiErrorSchema } from "@/lib/schema/api";
import type { LeverId } from "@/lib/core/levers";
import type { CompareRequest, CompareSchool } from "@/lib/schema/compare";
import type { EstimateRequest } from "@/lib/schema/estimate";
import type { CompareResponse } from "@/services/compare";
import type { EstimateResponse } from "@/services/estimate";
import { exampleRequest } from "@/lib/ui/example";
import type { CustomCostInput } from "./CustomCosts";
import { BotCheck } from "./BotCheck";
import { CompareView } from "./CompareView";
import { EmptyTree } from "./EmptyTree";
import { InputForm } from "./InputForm";
import { ResultView } from "./ResultView";

export type FlowResult =
  { kind: "single"; data: EstimateResponse } | { kind: "compare"; data: CompareResponse };
type Result = FlowResult;

export function EstimateFlow({
  initial,
  initialExtras,
  initialResult,
  aiEnabled,
  compareEnabled,
}: {
  initial: EstimateRequest | null;
  initialExtras: CompareSchool[];
  /** The shared link's result, computed on the server, so a reload shows it at once. */
  initialResult: FlowResult | null;
  aiEnabled: boolean;
  compareEnabled: boolean;
}) {
  const [botToken, setBotToken] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<Result | null>(initialResult);
  const [lastReq, setLastReq] = useState<EstimateRequest | null>(initial);
  // The form owns its fields; loading the example replaces them by remounting it.
  const [form, setForm] = useState<{ key: number; initial: EstimateRequest | null }>({
    key: 0,
    initial,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function post(
    path: string,
    body: EstimateRequest | CompareRequest,
    kind: Result["kind"],
    focus = true,
  ) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const parsed = ApiErrorSchema.safeParse(json);
        setError(parsed.success ? parsed.data.message : copy.errors.INTERNAL);
        return;
      }
      const next: Result =
        kind === "single"
          ? { kind, data: json as EstimateResponse }
          : { kind, data: json as CompareResponse };
      setResult(next);
      if (kind === "single") setLastReq(body as EstimateRequest);
      window.history.replaceState(null, "", `/?${next.data.shareQuery}`);
      if (focus)
        requestAnimationFrame(() => {
          const el = resultRef.current;
          if (!el) return;
          el.focus({ preventScroll: true });
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          (document.getElementById("breakdown") ?? el).scrollIntoView({
            behavior: reduce ? "auto" : "smooth",
            block: "start",
          });
        });
    } catch {
      setError(copy.errors.DATA_UNAVAILABLE);
    } finally {
      setSubmitting(false);
    }
  }

  /** The user's own added costs re-run the estimate and become part of the form's inputs. */
  function changeCustomCosts(costs: CustomCostInput[]) {
    if (!lastReq) return;
    const options = { ...lastReq.options };
    if (costs.length > 0) options.customCosts = costs;
    else delete options.customCosts;
    const req = { ...lastReq, options };
    setForm((f) => ({ key: f.key + 1, initial: req }));
    void post("/api/estimate", req, "single", false);
  }

  function showExample() {
    const req = exampleRequest();
    setForm((f) => ({ key: f.key + 1, initial: req }));
    void post("/api/estimate", req, "single");
  }

  return (
    <div>
      <InputForm
        key={form.key}
        initial={form.initial}
        initialExtras={initialExtras}
        onSubmit={(r) => void post("/api/estimate", r, "single")}
        onCompare={(r) => void post("/api/compare", r, "compare")}
        onExample={showExample}
        submitting={submitting}
        error={error}
        aiEnabled={aiEnabled}
        compareEnabled={compareEnabled}
        botToken={botToken}
      />
      {aiEnabled && <BotCheck onToken={setBotToken} />}
      {!result && <EmptyTree onExample={showExample} />}
      {result && (
        <div ref={resultRef} tabIndex={-1} className="focus:outline-none">
          {result.kind === "single" ? (
            <ResultView
              response={result.data}
              busy={submitting}
              onCustomCosts={changeCustomCosts}
              onToggleLevers={(ids: LeverId[]) => {
                if (lastReq)
                  void post("/api/estimate", { ...lastReq, levers: ids }, "single", false);
              }}
            />
          ) : (
            <CompareView response={result.data} />
          )}
        </div>
      )}
    </div>
  );
}
