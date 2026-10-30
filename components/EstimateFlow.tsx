"use client";

import { useRef, useState } from "react";
import { copy } from "@/content/copy";
import { ApiErrorSchema } from "@/lib/schema/api";
import type { EstimateRequest } from "@/lib/schema/estimate";
import type { EstimateResponse } from "@/services/estimate";
import { BotCheck } from "./BotCheck";
import { InputForm } from "./InputForm";
import { ResultView } from "./ResultView";

export function EstimateFlow({
  initial,
  aiEnabled,
}: {
  initial: EstimateRequest | null;
  aiEnabled: boolean;
}) {
  const [botToken, setBotToken] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function submit(req: EstimateRequest) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const parsed = ApiErrorSchema.safeParse(json);
        setError(parsed.success ? parsed.data.message : copy.errors.INTERNAL);
        return;
      }
      const data = json as EstimateResponse;
      setResult(data);
      window.history.replaceState(null, "", `/?${data.shareQuery}`);
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
        onSubmit={(r) => void submit(r)}
        submitting={submitting}
        error={error}
        aiEnabled={aiEnabled}
        botToken={botToken}
      />
      {aiEnabled && <BotCheck onToken={setBotToken} />}
      {result && (
        <div ref={resultRef} tabIndex={-1} className="mt-10 focus:outline-none" aria-live="polite">
          <ResultView response={result} aiEnabled={aiEnabled} botToken={botToken} />
        </div>
      )}
    </div>
  );
}
