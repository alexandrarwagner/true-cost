import { copy } from "@/content/copy";
import type { LeverId } from "@/lib/core/levers";
import { homeFromUsd, homeShort, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";
import { RangeSection } from "./RangeSection";
import { ResultNav } from "./ResultNav";
import { Savings } from "./Savings";
import { ShareBand } from "./ShareBand";
import { Shares } from "./Shares";
import { Tree } from "./Tree";

// Renders an estimate: the board's sections, in the board's order. The plain-English note, the
// payment timeline, the what-if slider and the per-line sources live on the full-calculation
// page. Server-safe: the client pieces (nav, count-up, chart, switches, custom costs) each have
// a no-JavaScript fallback or are simply absent.
export function ResultView({
  response,
  heading = copy.result.heading,
  shareQuery = response.shareQuery,
  editHref = "#estimate",
  onToggleLevers,
  busy = false,
}: {
  response: EstimateResponse;
  /** Overridden when the result sits under a comparison. */
  heading?: string;
  /** The link to share: the comparison's when there is one. */
  shareQuery?: string;
  /** Where "Edit" goes: the form on the home page, the editable link on the shared page. */
  editHref?: string;
  /** Switches the savings levers; absent on the server-rendered page, where rows are links. */
  onToggleLevers?: (ids: LeverId[]) => void;
  busy?: boolean;
}) {
  const { estimate: e, currency: cur } = response;
  const rate = e.fx.today?.rate;
  const inHome = rate !== undefined && cur.code !== "USD" && !e.input.options.payFromUsd;
  const total = inHome
    ? homeShort(homeFromUsd(e.totals.total, rate, cur), cur)
    : usdFmt(e.totals.total);
  const breakdownHref = `/estimate/breakdown?${shareQuery}`;
  return (
    <article>
      <ResultNav
        summary={copy.nav.summary(total, e.input.degreeYears)}
        editHref={editHref}
        breakdownHref={breakdownHref}
      />
      <h2 className="sr-only">{heading}</h2>
      {/* No key: a lever or an added cost updates the figures in place, so the tree lands and
          the total counts up once. */}
      <Tree response={response} breakdownHref={breakdownHref} />
      <Shares response={response} breakdownHref={breakdownHref} />
      <RangeSection response={response} />
      <Savings response={response} onToggle={onToggleLevers} busy={busy} />
      <ShareBand response={response} shareQuery={shareQuery} />
    </article>
  );
}
