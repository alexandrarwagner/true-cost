import { copy } from "@/content/copy";
import type { LeverId } from "@/lib/core/levers";
import { homeFromUsd, homeShort, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";
import { CustomCosts, type CustomCostInput } from "./CustomCosts";
import { Explanation } from "./Explanation";
import { Headline } from "./Headline";
import { RangeSection } from "./RangeSection";
import { ResultNav } from "./ResultNav";
import { Savings } from "./Savings";
import { ShareBar } from "./ShareBar";
import { Shares } from "./Shares";
import { Sources } from "./Sources";
import { Timeline } from "./Timeline";
import { Tree } from "./Tree";

// Renders an estimate. Server-safe: the client pieces (nav, count-up, chart, slider, switches,
// custom costs) each have a no-JavaScript fallback or are simply absent.
export function ResultView({
  response,
  aiEnabled = false,
  botToken,
  heading = copy.result.heading,
  shareQuery = response.shareQuery,
  editHref = "#estimate",
  onToggleLevers,
  onCustomCosts,
  busy = false,
}: {
  response: EstimateResponse;
  aiEnabled?: boolean;
  botToken?: string;
  /** Overridden when the result sits under a comparison. */
  heading?: string;
  /** The link to share: the comparison's when there is one. */
  shareQuery?: string;
  /** Where "Edit" goes: the form on the home page, the editable link on the shared page. */
  editHref?: string;
  /** Switches the savings levers; absent on the server-rendered page, where rows are links. */
  onToggleLevers?: (ids: LeverId[]) => void;
  /** Re-runs the estimate with the user's own added costs; absent on the shared page. */
  onCustomCosts?: (costs: CustomCostInput[]) => void;
  busy?: boolean;
}) {
  const { estimate: e, currency: cur } = response;
  const rate = e.fx.today?.rate;
  const inHome = rate !== undefined && cur.code !== "USD" && !e.input.options.payFromUsd;
  const total = inHome
    ? homeShort(homeFromUsd(e.totals.total, rate, cur), cur)
    : usdFmt(e.totals.total);
  const runKey = `${response.savings?.active.join(",") ?? ""}|${e.input.options.customCosts?.length ?? 0}`;
  const customCosts: CustomCostInput[] = (e.input.options.customCosts ?? []).map((c) => ({
    label: c.label,
    amount: c.converted ? c.converted.amountHome : c.amountUsd / 100,
    currency: c.converted ? "home" : "USD",
    frequency: c.frequency === "monthly" ? "monthly" : "one_off",
  }));
  return (
    <article className="space-y-10">
      <ResultNav summary={copy.nav.summary(total, e.input.degreeYears)} editHref={editHref} />
      <h2 className="sr-only">{heading}</h2>
      <Tree key={runKey} response={response} />
      <Headline response={response} />
      {onCustomCosts && (
        <CustomCosts
          value={customCosts}
          homeCurrency={cur.code}
          busy={busy}
          onChange={onCustomCosts}
        />
      )}
      <Shares response={response} />
      <RangeSection response={response} />
      <Savings response={response} onToggle={onToggleLevers} busy={busy} />
      <Explanation response={response} aiEnabled={aiEnabled} botToken={botToken} />
      <Timeline response={response} />
      <Sources response={response} />
      <ShareBar shareQuery={shareQuery} />
    </article>
  );
}
