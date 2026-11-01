"use client";

import { useState } from "react";
import { templateExplanation } from "@/lib/adapters/ai/validate";
import { copy } from "@/content/copy";
import { decodeShare } from "@/lib/schema/share";
import type { EstimateResponse } from "@/services/estimate";
import { explainInputFromClient } from "@/lib/ui/explain";

interface Props {
  response: EstimateResponse;
  aiEnabled: boolean;
  botToken?: string;
}

// The template is rendered on the server for everyone; AI wording replaces it on request.
export function Explanation({ response, aiEnabled, botToken }: Props) {
  const template = templateExplanation(explainInputFromClient(response));
  const [text, setText] = useState(template);
  const [by, setBy] = useState<"template" | "ai">("template");
  const [busy, setBusy] = useState(false);

  async function explain() {
    const request = decodeShare(new URLSearchParams(response.shareQuery));
    if (!request) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request, ...(botToken ? { botToken } : {}) }),
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
    <section
      id="where"
      aria-labelledby="explain-heading"
      className="scroll-mt-24 border border-neutral-300 p-4"
    >
      <h3 id="explain-heading" className="font-medium">
        {copy.ai.explainHeading}
      </h3>
      <p className="mt-2" aria-live="polite">
        {text}
      </p>
      <p className="mt-1 text-sm text-neutral-700">
        {by === "ai" ? copy.ai.byAi : copy.ai.byTemplate}
      </p>
      {aiEnabled && by === "template" && (
        <p className="mt-2 print:hidden">
          <button
            type="button"
            className="border border-neutral-900 bg-white px-3 py-1 text-sm hover:bg-neutral-100 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-900 disabled:opacity-60"
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
