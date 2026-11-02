import { copy } from "@/content/copy";
import { TRANSFER_DEFAULT, TRANSFER_REFERENCE } from "@/data/constants";
import type { LeverId, RankedLever } from "@/lib/core/levers";
import type { EstimateResponse } from "@/services/estimate";
import { homeShort, usdFmt } from "@/lib/ui/format";
import { ConfidenceMark } from "./ConfidenceMark";
import { LeverSwitch } from "./LeverSwitch";

interface Props {
  lever: RankedLever;
  response: EstimateResponse;
  on: boolean;
  /** The active lever that excludes this one, if any. */
  blockedBy?: LeverId;
  busy: boolean;
  /** With JavaScript: a switch. Without (the shared page): a link that toggles via the URL. */
  onToggle?: (id: LeverId, on: boolean) => void;
  toggleHref: string;
}

/** One lever, laid out like the board's tip columns: title, saving, how, mark, switch. */
export function SavingsRow({ lever, response, on, blockedBy, busy, onToggle, toggleHref }: Props) {
  const t = copy.savings;
  const cur = response.currency;
  const title =
    lever.id === "insurance-waiver" && !lever.hasFigure ? t.waiverCheckTitle : t.titles[lever.id];
  const transfer = response.estimate.input.options.transfer ?? TRANSFER_DEFAULT;
  const note =
    lever.noteId === "transfer_markup"
      ? t.markupNote(
          (transfer.markupBps / 100).toFixed(1),
          (TRANSFER_REFERENCE.markupBps / 100).toFixed(1),
        )
      : (t.notes[lever.noteId] ?? "");
  const noteId = `lever-${lever.id}-note`;
  const name = title ?? lever.id;
  return (
    <li className="flex flex-col gap-2.5 border-t border-line-strong py-6 md:border-t-0 md:border-l md:pt-6 md:pr-7 md:pl-7 md:first:pl-0 md:first:border-l-0">
      <p className="text-[19px] leading-snug font-semibold">{title}</p>
      {lever.hasFigure ? (
        <p className="text-[15px] font-semibold">
          {lever.savingHome !== undefined
            ? t.saving(homeShort(lever.savingHome, cur), usdFmt(lever.savingUsd))
            : t.savingUsd(usdFmt(lever.savingUsd))}
        </p>
      ) : (
        <p className="text-[15px] font-semibold text-muted">{t.tip}</p>
      )}
      <p id={noteId} className="text-[15px] leading-relaxed text-muted">
        {note}
      </p>
      <p className="text-[13px] text-muted">
        <ConfidenceMark kind={lever.confidence} />
      </p>
      {lever.hasFigure && (
        <div className="mt-auto pt-1">
          {onToggle ? (
            <LeverSwitch
              id={lever.id}
              on={on}
              disabled={busy || blockedBy !== undefined}
              describedBy={noteId}
              label={t.tryIt(name)}
              onChange={(checked) => onToggle(lever.id, checked)}
            />
          ) : (
            <a href={toggleHref} className="underline underline-offset-4">
              {on ? `${t.tryIt(name)} (on)` : t.tryIt(name)}
            </a>
          )}
          {blockedBy && (
            <p className="mt-1 text-sm text-muted">
              {t.unavailable(t.titles[blockedBy] ?? blockedBy)}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
