import { copy } from "@/content/copy";
import type { Confidence } from "@/lib/core/types";

/**
 * The source mark from the board: a dot in the tuition colour for a school figure, a solid
 * square for government data, a dashed circle for our estimates, a solid dot for the user's
 * own numbers. Always paired with its label, so the shape is never the only signal.
 */
export function ConfidenceMark({ kind, className = "" }: { kind: Confidence; className?: string }) {
  const shape =
    kind === "estimate"
      ? "h-3 w-3 rounded-full border-2 border-dashed border-current"
      : kind === "user"
        ? "h-3 w-3 rounded-full bg-current"
        : kind === "school"
          ? "h-3 w-3 rounded-full bg-cat-tuition"
          : "h-3 w-3 rounded-[3px] bg-dark";
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap ${className}`}>
      <span aria-hidden="true" className={`shrink-0 ${shape}`} />
      {copy.confidence[kind]}
    </span>
  );
}
