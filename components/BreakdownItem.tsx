import { copy } from "@/content/copy";
import { SOURCES } from "@/data/sources";
import { degreeTotal } from "@/lib/core/estimate";
import type { LineItem } from "@/lib/core/types";
import { dateFmt, home, homeFromUsd, usdFmt, type CurrencyDisplay } from "@/lib/ui/format";
import { itemSentences } from "@/lib/ui/formula";
import { ConfidenceMark } from "./ConfidenceMark";

interface Props {
  item: LineItem;
  years: number;
  cur: CurrencyDisplay;
  rate?: number;
}

/** One line of the full calculation: a table row on wide screens, a stacked card on phones. */
export function BreakdownItem({ item, years, cur, rate }: Props) {
  const t = copy.breakdown;
  const { formula, overDegree } = itemSentences(item, years);
  const total = degreeTotal(item, years);
  const inHome = rate !== undefined && cur.code !== "USD";
  const registry = SOURCES[item.source.id];
  const cell = "block py-1 sm:table-cell sm:py-2 sm:pr-4 sm:align-top";
  return (
    <tr className="block border-b border-line py-3 sm:table-row">
      <th scope="row" className={`${cell} font-semibold`}>
        {copy.items[item.id] ?? item.id}
        {item.noteId && copy.notes[item.noteId] && (
          <span className="block text-xs font-normal text-muted">{copy.notes[item.noteId]}</span>
        )}
      </th>
      <td data-label={t.whenPaid} className={`${cell} text-sm`}>
        {t.billing[item.billing] ?? item.billing}
      </td>
      <td data-label={t.howWorkedOut} className={`${cell} text-sm`}>
        <span className="block">{formula}</span>
        <span className="block text-muted">{overDegree}</span>
        {item.range && (
          <span className="block text-muted">
            {t.band(usdFmt(item.range.low), usdFmt(item.range.high))}
          </span>
        )}
      </td>
      <td data-label={t.amount} className={`${cell} text-sm tabular-nums`}>
        <span className="block">{usdFmt(total)}</span>
        {inHome && (
          <span className="block text-muted">{home(homeFromUsd(total, rate, cur), cur)}</span>
        )}
      </td>
      <td data-label={t.confidence} className={`${cell} text-sm`}>
        <ConfidenceMark kind={item.source.kind} />
      </td>
      <td data-label={t.source} className={`${cell} text-sm`}>
        {registry.url ? (
          <a
            href={item.source.url ?? registry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            {registry.name}
            <span className="sr-only"> ({copy.opensInNewTab})</span>
          </a>
        ) : (
          registry.name
        )}
        <span className="block text-muted">
          {item.source.name}
          {item.source.date ? `, ${t.checkedOn(dateFmt(item.source.date))}` : ""}
        </span>
      </td>
    </tr>
  );
}
