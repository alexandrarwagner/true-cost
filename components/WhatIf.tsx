"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import { whatIf } from "@/lib/core/fxReplay";
import { homeShort } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";

export function WhatIf({ response }: { response: EstimateResponse }) {
  const [pct, setPct] = useState(0);
  const { estimate: e, currency: cur } = response;
  const today = e.fx.today;
  if (!today) return null;
  const total = whatIf(e.schedule, today, pct, cur.minorDigits, response.generatedAt.slice(0, 10));
  return (
    <div className="mt-4 border border-neutral-300 p-3 print:hidden">
      <h4 className="font-medium">{copy.result.whatIfHeading}</h4>
      <label className="mt-2 block">
        {copy.result.whatIfLabel}: {pct}%{" "}
        {pct >= 0 ? copy.result.whatIfWeaker : copy.result.whatIfStronger}
        <input
          type="range"
          min={-30}
          max={30}
          step={1}
          value={pct}
          onChange={(ev) => setPct(Number(ev.target.value))}
          className="mt-1 w-full"
        />
      </label>
      <p className="mt-2" aria-live="polite">
        {copy.result.whatIfResult(pct, homeShort(total, cur))}
      </p>
      <p className="mt-1 text-sm text-neutral-700">{copy.fx.notPrediction}</p>
    </div>
  );
}
