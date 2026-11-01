import { copy } from "@/content/copy";
import type { LeverId } from "@/lib/core/levers";
import type { EstimateResponse } from "@/services/estimate";
import { Explanation } from "./Explanation";
import { Headline } from "./Headline";
import { RangeSection } from "./RangeSection";
import { Savings } from "./Savings";
import { ShareBar } from "./ShareBar";
import { Sources } from "./Sources";
import { Timeline } from "./Timeline";
import { Unfold } from "./Unfold";

// Renders an estimate. Server-safe: the only client pieces are the chart, the slider and the
// copy-link button, each of which has a no-JavaScript fallback.
export function ResultView({
  response,
  aiEnabled = false,
  botToken,
  heading = copy.result.heading,
  shareQuery = response.shareQuery,
  onToggleLevers,
  busy = false,
}: {
  response: EstimateResponse;
  aiEnabled?: boolean;
  botToken?: string;
  /** Overridden when the result sits under a comparison. */
  heading?: string;
  /** The link to share: the comparison's when there is one. */
  shareQuery?: string;
  /** Switches the savings levers; absent on the server-rendered page, where rows are links. */
  onToggleLevers?: (ids: LeverId[]) => void;
  busy?: boolean;
}) {
  const leverKey = response.savings?.active.join(",") ?? "";
  return (
    <article className="space-y-8">
      <h2 className="text-xl font-semibold">{heading}</h2>
      <Headline response={response} />
      <Explanation response={response} aiEnabled={aiEnabled} botToken={botToken} />
      <Unfold key={leverKey} response={response} />
      <RangeSection response={response} />
      <Savings response={response} onToggle={onToggleLevers} busy={busy} />
      <Timeline response={response} />
      <Sources response={response} />
      <ShareBar shareQuery={shareQuery} />
    </article>
  );
}
