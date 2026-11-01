import { copy } from "@/content/copy";
import { degreeTotal } from "@/lib/core/estimate";
import { usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";

const badge = "inline-block border border-neutral-900 px-1 text-xs uppercase tracking-wide";

export function Sources({ response }: { response: EstimateResponse }) {
  const { estimate: e } = response;
  const years = e.input.degreeYears;
  return (
    <section id="how" aria-labelledby="sources-heading">
      <h3 id="sources-heading" className="text-lg font-semibold">
        {copy.result.sourcesHeading}
      </h3>
      <p className="mt-1 text-sm text-neutral-700">{copy.result.sourcesIntro}</p>
      <ul className="mt-2 divide-y divide-neutral-300 border-y border-neutral-300">
        {e.items.map((item) => {
          const perDegree = degreeTotal(item, years);
          return (
            <li key={item.id}>
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {copy.items[item.id] ?? item.id}{" "}
                    <span className={badge}>{copy.confidence[item.source.kind]}</span>
                  </span>
                  <span className="tabular-nums text-sm">
                    {item.riskOnly
                      ? `${usdFmt(item.range?.low ?? (0 as never))} to ${usdFmt(item.range?.high ?? (0 as never))}`
                      : `${usdFmt(item.amountUsd)} ${copy.result.frequencies[item.frequency]}`}
                    {!item.riskOnly && !item.timingOnly && item.frequency !== "one_off" && (
                      <span className="text-neutral-700">
                        {" "}
                        · {usdFmt(perDegree)} {copy.result.perDegree}
                      </span>
                    )}
                  </span>
                </summary>
                <div className="pb-2 pl-2 text-sm">
                  <p>
                    {item.source.name}
                    {item.source.url && (
                      <>
                        {" "}
                        (
                        <a
                          href={item.source.url}
                          className="underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          source
                        </a>
                        )
                      </>
                    )}
                    {item.source.date && <>, {copy.result.checked(item.source.date)}</>}
                  </p>
                  {item.range && !item.riskOnly && (
                    <p className="text-neutral-700">
                      Likely between {usdFmt(item.range.low)} and {usdFmt(item.range.high)}.
                    </p>
                  )}
                  {item.noteId && copy.notes[item.noteId] && (
                    <p className="text-neutral-700">{copy.notes[item.noteId]}</p>
                  )}
                  {item.timingOnly && (
                    <p className="text-neutral-700">{copy.notes["deposit_credited_to_tuition"]}</p>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      {e.noteIds.length > 0 && (
        <ul className="mt-3 list-disc pl-5 text-sm">
          {e.noteIds.map((n) => copy.notes[n] && <li key={n}>{copy.notes[n]}</li>)}
        </ul>
      )}
    </section>
  );
}
