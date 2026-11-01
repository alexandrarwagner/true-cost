import { copy } from "@/content/copy";
import type { Confidence } from "@/lib/core/types";

/**
 * The source mark from the design system: a solid square for official figures (school or
 * government), a dashed circle for our estimates, a solid dot for the user's own numbers.
 * Always paired with its label, so the shape is never the only signal.
 */
export function ConfidenceMark({ kind, className = "" }: { kind: Confidence; className?: string }) {
  const shape =
    kind === "estimate"
      ? "h-2.5 w-2.5 rounded-full border border-dashed border-current"
      : kind === "user"
        ? "h-2.5 w-2.5 rounded-full bg-current"
        : "h-2.5 w-2.5 bg-current";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
      <span aria-hidden="true" className={shape} />
      {copy.confidence[kind]}
    </span>
  );
}
