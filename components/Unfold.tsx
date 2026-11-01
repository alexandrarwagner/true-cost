import { copy } from "@/content/copy";
import { home, homeFromUsd, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";

// The unfold: tuition, then each hidden layer, then the total. Rows appear one after another
// with a CSS animation that prefers-reduced-motion switches off (globals.css). No JavaScript.
export function Unfold({ response }: { response: EstimateResponse }) {
  const { estimate: e, currency: cur } = response;
  const t = e.totals;
  const rate = e.fx.today?.rate;
  const rows: Array<[keyof typeof copy.result.unfoldRows, number]> = [
    ["tuition", t.tuition],
    ["housing", t.housing],
    ["health_insurance", t.healthInsurance],
    ["living", t.living],
    ["one_off", t.oneOff],
    ["money_moving", t.moneyMoving],
    ["total", t.total],
  ];
  return (
    <section aria-labelledby="unfold-heading">
      <h3 id="unfold-heading" className="text-lg font-semibold">
        {copy.result.unfoldHeading}
      </h3>
      <table className="mt-2 w-full border-collapse text-left">
        <thead className="sr-only">
          <tr>
            <th scope="col">Step</th>
            <th scope="col">US dollars</th>
            {rate && cur.code !== "USD" && <th scope="col">In your currency</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, amount]) => (
            <tr
              key={key}
              className={`unfold-row border-t border-neutral-300 ${key === "total" ? "border-t-2 border-neutral-900 font-semibold" : ""}`}
            >
              <th scope="row" className="py-2 pr-4 font-normal">
                {copy.result.unfoldRows[key]}
              </th>
              <td className="py-2 pr-4 text-right tabular-nums">{usdFmt(amount as never)}</td>
              {rate && cur.code !== "USD" && (
                <td className="py-2 text-right tabular-nums">
                  {home(homeFromUsd(amount as never, rate, cur), cur)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
