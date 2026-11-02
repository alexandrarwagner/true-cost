import { copy } from "@/content/copy";
import { SOURCES } from "@/data/sources";
import { METHODOLOGY } from "@/lib/ui/methodology";
import { CATEGORY_BG } from "./CategoryChip";
import { ConfidenceMark } from "./ConfidenceMark";

const COLS = "md:grid-cols-[200px_minmax(0,1.25fr)_minmax(0,1fr)_150px]";

/** "How we work it out": one row per cost, sources from the registry, always on the page. */
export function Methodology() {
  const t = copy.methodology;
  return (
    <section
      id="how"
      aria-labelledby="how-heading"
      className="container mt-20 scroll-mt-24 lg:mt-40"
    >
      <div className="flex flex-wrap items-end justify-between gap-6 lg:gap-10">
        <h2 id="how-heading" className="display max-w-[700px] text-4xl sm:text-display">
          {t.heading}
        </h2>
        <p className="max-w-[460px] text-lg leading-relaxed text-muted">{t.intro}</p>
      </div>
      <div className="mt-10 rounded-[28px] bg-card px-5 pt-3 pb-5 shadow-card sm:px-10">
        <div
          className={`hidden gap-8 py-4 text-sm font-semibold text-muted md:grid ${COLS}`}
          aria-hidden="true"
        >
          <span>{t.columns.cost}</span>
          <span>{t.columns.how}</span>
          <span>{t.columns.source}</span>
          <span>{t.columns.type}</span>
        </div>
        <table className="block w-full border-collapse text-left md:table">
          <thead className="sr-only">
            <tr>
              <th scope="col">{t.columns.cost}</th>
              <th scope="col">{t.columns.how}</th>
              <th scope="col">{t.columns.source}</th>
              <th scope="col">{t.columns.type}</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {METHODOLOGY.map((row) => (
              <tr
                key={row.key}
                className={`grid gap-2 border-t border-line py-5 md:gap-8 md:py-6 ${COLS} md:items-start`}
              >
                <th scope="row" className="flex items-center gap-2.5 text-[19px] font-semibold">
                  <span
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 shrink-0 rounded-[4px] ${row.key === "fx" ? "bg-dark" : CATEGORY_BG[row.key]}`}
                  />
                  {row.key === "fx" ? t.fxRow : copy.categories[row.key]}
                </th>
                <td className="text-[17px] leading-relaxed">{t.rows[row.key]}</td>
                <td className="text-[15px] leading-relaxed text-muted">
                  {row.sourceIds.map((id, i) => {
                    const s = SOURCES[id];
                    return (
                      <span key={id}>
                        {i > 0 ? "; " : ""}
                        {s.url ? (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-4"
                          >
                            {s.name}
                            <span className="sr-only"> ({copy.opensInNewTab})</span>
                          </a>
                        ) : (
                          s.name
                        )}
                      </span>
                    );
                  })}
                </td>
                <td className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted md:flex-col">
                  {row.kinds.map((k) => (
                    <ConfidenceMark key={k} kind={k} />
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
