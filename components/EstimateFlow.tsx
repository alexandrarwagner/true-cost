"use client";

import { useRef, useState } from "react";
import { copy } from "@/content/copy";
import { ApiErrorSchema } from "@/lib/schema/api";
import type { CompareRequest, CompareSchool } from "@/lib/schema/compare";
import type { EstimateRequest } from "@/lib/schema/estimate";
import type { CompareResponse } from "@/services/compare";
import type { EstimateResponse } from "@/services/estimate";
import { BotCheck } from "./BotCheck";
import { CompareView } from "./CompareView";
import { InputForm } from "./InputForm";
import { ResultView } from "./ResultView";

type Result =
  { kind: "single"; data: EstimateResponse } | { kind: "compare"; data: CompareResponse };

export function EstimateFlow({
  initial,
  initialExtras,
  aiEnabled,
  compareEnabled,
}: {
  initial: EstimateRequest | null;
  initialExtras: CompareSchool[];
  aiEnabled: boolean;
  compareEnabled: boolean;
}) {
  const [botToken, setBotToken] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function post(path: string, body: EstimateRequest | CompareRequest, kind: Result["kind"]) {
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
      window.history.replaceState(null, "", `/?${next.data.shareQuery}`);
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch {
      setError(copy.errors.DATA_UNAVAILABLE);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <InputForm
        initial={initial}
        initialExtras={initialExtras}
        onSubmit={(r) => void post("/api/estimate", r, "single")}
        onCompare={(r) => void post("/api/compare", r, "compare")}
        submitting={submitting}
        error={error}
        aiEnabled={aiEnabled}
        compareEnabled={compareEnabled}
        botToken={botToken}
      />
      {aiEnabled && <BotCheck onToken={setBotToken} />}
      {result && (
        <div ref={resultRef} tabIndex={-1} className="mt-10 focus:outline-none" aria-live="polite">
          {result.kind === "single" ? (
            <ResultView response={result.data} aiEnabled={aiEnabled} botToken={botToken} />
          ) : (
            <CompareView response={result.data} aiEnabled={aiEnabled} botToken={botToken} />
          )}
        </div>
      )}
    </div>
  );
}
