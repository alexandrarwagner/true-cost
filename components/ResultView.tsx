import { copy } from "@/content/copy";
import type { EstimateResponse } from "@/services/estimate";
import { Explanation } from "./Explanation";
import { Headline } from "./Headline";
import { RangeSection } from "./RangeSection";
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
}: {
  response: EstimateResponse;
  aiEnabled?: boolean;
  botToken?: string;
}) {
  return (
    <article className="space-y-8">
      <h2 className="text-xl font-semibold">{copy.result.heading}</h2>
      <Headline response={response} />
      <Explanation response={response} aiEnabled={aiEnabled} botToken={botToken} />
      <Unfold response={response} />
      <RangeSection response={response} />
      <Timeline response={response} />
      <Sources response={response} />
      <ShareBar response={response} />
    </article>
  );
}
