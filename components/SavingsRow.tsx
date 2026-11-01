import { copy } from "@/content/copy";
import { TRANSFER_DEFAULT, TRANSFER_REFERENCE } from "@/data/constants";
import type { LeverId, RankedLever } from "@/lib/core/levers";
import type { EstimateResponse } from "@/services/estimate";
import { homeShort, usdFmt } from "@/lib/ui/format";
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

const badge =
  "inline-block border border-neutral-900 px-1.5 py-0.5 text-xs uppercase tracking-wide";

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
  return (
    <li className="border-t border-neutral-300 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-x-6">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{title}</p>
          {lever.hasFigure ? (
            <p>
              {lever.savingHome !== undefined
                ? t.saving(homeShort(lever.savingHome, cur), usdFmt(lever.savingUsd))
                : t.savingUsd(usdFmt(lever.savingUsd))}
            </p>
          ) : (
            <p className="text-neutral-700">{t.tip}</p>
          )}
          <p id={noteId} className="mt-1 text-sm text-neutral-700">
            {note}
          </p>
          <p className="mt-1">
            <span className={badge}>{copy.confidence[lever.confidence]}</span>
          </p>
        </div>
        {lever.hasFigure && (
          <div className="shrink-0">
            {onToggle ? (
              <LeverSwitch
                id={lever.id}
                on={on}
                disabled={busy || blockedBy !== undefined}
                describedBy={noteId}
                label={t.tryIt(title ?? lever.id)}
                onChange={(checked) => onToggle(lever.id, checked)}
              />
            ) : (
              <a href={toggleHref} className="underline">
                {on ? `${t.tryIt(title ?? lever.id)} (on)` : t.tryIt(title ?? lever.id)}
              </a>
            )}
            {blockedBy && (
              <p className="mt-1 text-sm text-neutral-700">
                {t.unavailable(t.titles[blockedBy] ?? blockedBy)}
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
