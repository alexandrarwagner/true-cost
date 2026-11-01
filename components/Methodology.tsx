import { copy } from "@/content/copy";
import { SOURCES } from "@/data/sources";
import { METHODOLOGY } from "@/lib/ui/methodology";
import { CategoryChip } from "./CategoryChip";
import { ConfidenceMark } from "./ConfidenceMark";

/** "How we work it out": one row per cost, sources from the registry, always on the page. */
export function Methodology() {
  const t = copy.methodology;
  return (
    <section
      id="how"
      aria-labelledby="how-heading"
      className="mx-auto mt-16 max-w-5xl scroll-mt-24"
    >
      <div className="grid gap-4 md:grid-cols-[1fr_1fr] md:items-end">
        <h2 id="how-heading" className="display text-3xl sm:text-4xl">
          {t.heading}
        </h2>
        <p className="text-muted md:text-right">{t.intro}</p>
      </div>
      <div className="mt-6 rounded-card bg-card p-4 shadow-card">
        <table className="block w-full border-collapse text-left text-sm sm:table">
          <thead className="sr-only sm:not-sr-only">
            <tr className="border-b border-line-strong">
              <th scope="col" className="py-2 pr-4">
                {t.columns.cost}
              </th>
              <th scope="col" className="py-2 pr-4">
                {t.columns.how}
              </th>
              <th scope="col" className="py-2 pr-4">
                {t.columns.source}
              </th>
              <th scope="col" className="py-2">
                {t.columns.type}
              </th>
            </tr>
          </thead>
          <tbody className="block sm:table-row-group">
            {METHODOLOGY.map((row) => (
              <tr
                key={row.key}
                className="block border-b border-line py-3 align-top sm:table-row sm:py-0"
              >
                <th scope="row" className="block py-1 pr-4 font-normal sm:table-cell sm:py-3">
                  {row.key === "fx" ? (
                    <span className="font-semibold">{t.fxRow}</span>
                  ) : (
                    <CategoryChip category={row.key} />
                  )}
                </th>
                <td data-label={t.columns.how} className="block py-1 pr-4 sm:table-cell sm:py-3">
                  {t.rows[row.key]}
                </td>
                <td
                  data-label={t.columns.source}
                  className="block py-1 pr-4 text-muted sm:table-cell sm:py-3"
                >
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
                <td data-label={t.columns.type} className="block py-1 sm:table-cell sm:py-3">
                  <span className="flex flex-wrap gap-x-3 gap-y-1 sm:flex-col">
                    {row.kinds.map((k) => (
                      <ConfidenceMark key={k} kind={k} />
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
