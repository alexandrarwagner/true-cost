import { copy } from "@/content/copy";
import { dealReportHref } from "@/lib/ui/dealReport";
import { homeShort, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";
import { Explanation } from "./Explanation";
import { Timeline } from "./Timeline";
import { WhatIf } from "./WhatIf";

/**
 * After the line items: the plain-English note, the payment timeline, the exchange-rate method
 * with the what-if slider, the money-moving trace, what is left out, and the mistake link.
 */
export function BreakdownMethod({
  response,
  reportUrl,
  aiEnabled,
}: {
  response: EstimateResponse;
  reportUrl: string;
  aiEnabled: boolean;
}) {
  const t = copy.breakdown;
  const { estimate: e, currency: cur } = response;
  const fx = e.fx;
  const mm = e.moneyMoving;
  const uncertainty = response.savings?.uncertainty;
  const notes = e.noteIds.filter((n) => copy.notes[n]);
  return (
    <>
      <Explanation response={response} aiEnabled={aiEnabled} />
      {notes.length > 0 && (
        <section aria-labelledby="notes-heading">
          <h2 id="notes-heading" className="text-2xl font-semibold">
            {t.notesHeading}
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {notes.map((n) => (
              <li key={n}>{copy.notes[n]}</li>
            ))}
          </ul>
        </section>
      )}
      <Timeline response={response} />
      <section
        id="fx-method"
        aria-labelledby="fx-method-heading"
        className="print:break-before-page"
      >
        <h2 id="fx-method-heading" className="text-2xl font-semibold">
          {t.fxHeading}
        </h2>
        {fx.kind === "replay" ? (
          <>
            <p className="mt-2">
              {t.fxMethod(e.input.degreeYears, fx.historyFrom.slice(0, 4), fx.windows.length)}
            </p>
            <p className="mt-1">
              {t.fxValues(
                homeShort(fx.best10Home, cur),
                homeShort(fx.medianHome, cur),
                homeShort(fx.worst10Home, cur),
              )}
            </p>
            <p className="mt-1 font-medium">{copy.fx.notPrediction}</p>
            <p className="mt-3 max-w-[70ch]">{copy.fx.whatYouCanDo}</p>
            {uncertainty && cur.code !== "USD" && (
              <p className="mt-3 max-w-[70ch]">
                <b>{copy.savings.uncertainty.heading}.</b>{" "}
                {copy.savings.uncertainty.body(
                  `${homeShort(uncertainty.lowHome, cur)} to ${homeShort(uncertainty.highHome, cur)}`,
                )}
              </p>
            )}
          </>
        ) : (
          <p className="mt-2">{t.fxNone}</p>
        )}
      </section>

      {fx.kind === "replay" && <WhatIf response={response} />}

      <section aria-labelledby="moving-heading">
        <h2 id="moving-heading" className="text-2xl font-semibold">
          {t.movingHeading}
        </h2>
        <p className="mt-2">
          {mm.transfers === 0
            ? t.movingNone
            : t.moving(
                mm.transfers,
                (mm.markupBps / 100).toFixed(1),
                usdFmt(mm.fixedFeeUsd),
                usdFmt(mm.markupUsd),
                usdFmt(mm.feesUsd),
                usdFmt(mm.totalUsd),
              )}
        </p>
      </section>

      <section aria-labelledby="not-included-heading">
        <h2 id="not-included-heading" className="text-2xl font-semibold">
          {t.notIncludedHeading}
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {t.notIncluded.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="mistake-heading" className="print:hidden">
        <h2 id="mistake-heading" className="text-2xl font-semibold">
          {t.mistakeHeading}
        </h2>
        <p className="mt-2">{t.mistake}</p>
        <p className="mt-2">
          <a
            href={dealReportHref(reportUrl, "breakdown", {
              subject: t.mistakeSubject,
              body: t.mistakeBody,
            })}
            rel="noopener noreferrer"
            className="inline-block rounded-pill border border-line-strong px-4 py-2 underline-offset-4 hover:bg-card"
          >
            {t.mistakeLink}
          </a>
        </p>
      </section>
    </>
  );
}
