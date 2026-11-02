"use client";

import { useState } from "react";
import { BotCheck } from "./BotCheck";
import { templateExplanation } from "@/lib/adapters/ai/validate";
import { copy } from "@/content/copy";
import { decodeShare } from "@/lib/schema/share";
import type { EstimateResponse } from "@/services/estimate";
import { explainInputFromClient } from "@/lib/ui/explain";

interface Props {
  response: EstimateResponse;
  aiEnabled: boolean;
  /** From the page's own bot check; when absent and AI is on, this component runs its own. */
  botToken?: string;
}

// The template is rendered on the server for everyone; AI wording replaces it on request.
export function Explanation({ response, aiEnabled, botToken }: Props) {
  const template = templateExplanation(explainInputFromClient(response));
  const [text, setText] = useState(template);
  const [by, setBy] = useState<"template" | "ai">("template");
  const [busy, setBusy] = useState(false);
  const [ownToken, setOwnToken] = useState<string | undefined>(undefined);
  const token = botToken ?? ownToken;

  async function explain() {
    const request = decodeShare(new URLSearchParams(response.shareQuery));
    if (!request) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request, ...(token ? { botToken: token } : {}) }),
      });
      if (res.ok) {
        const json = (await res.json()) as { text: string; generatedBy: "ai" | "template" };
        setText(json.text);
        setBy(json.generatedBy);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="explain" aria-labelledby="explain-heading">
      <h2 id="explain-heading" className="text-2xl font-semibold">
        {copy.ai.explainHeading}
      </h2>
      {aiEnabled && botToken === undefined && <BotCheck onToken={setOwnToken} />}
      <p className="mt-2 max-w-[70ch]" aria-live="polite">
        {text}
      </p>
      <p className="mt-1 text-sm text-muted">{by === "ai" ? copy.ai.byAi : copy.ai.byTemplate}</p>
      {aiEnabled && by === "template" && (
        <p className="mt-2 print:hidden">
          <button
            type="button"
            className="inline-flex h-11 items-center rounded-pill border-[1.5px] border-ink px-5 text-[15px] hover:bg-card disabled:opacity-60"
            onClick={() => void explain()}
            disabled={busy}
          >
            {busy ? copy.ai.explaining : copy.ai.explainButton}
          </button>
        </p>
      )}
    </section>
  );
}
