"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { copy } from "@/content/copy";
import type { FxPathPoint } from "@/lib/core/types";
import { homeShort, monthYear, type CurrencyDisplay } from "@/lib/ui/format";

// Cumulative spend: today's rate as a solid line, the middle 80% of past periods as a band,
// the worst tenth dashed. Design-system colours; the table beside it carries the same numbers.
export function RangeChart({ path, currency }: { path: FxPathPoint[]; currency: CurrencyDisplay }) {
  const scale = Math.pow(10, currency.minorDigits);
  const data = path.map((p) => ({
    date: p.date,
    band: [p.best10 / scale, p.worst10 / scale],
    worst: p.worst10 / scale,
    baseline: p.baseline / scale,
  }));
  const fmt = (v: number) => homeShort(Math.round(v * scale) as never, currency);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
        accessibilityLayer={false}
      >
        <CartesianGrid stroke="#dcdde3" strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={monthYear} stroke="#4a4b63" fontSize={12} />
        <YAxis tickFormatter={fmt} stroke="#4a4b63" fontSize={12} width={90} />
        <Tooltip
          formatter={(value) =>
            Array.isArray(value)
              ? `${fmt(Number(value[0] ?? 0))} to ${fmt(Number(value[1] ?? 0))}`
              : fmt(Number(value))
          }
          labelFormatter={(d) => monthYear(String(d))}
        />
        <Area
          type="monotone"
          dataKey="band"
          stroke="none"
          fill="#c9cbfa"
          fillOpacity={0.7}
          isAnimationActive={false}
          name={copy.fx.legend.band}
        />
        <Line
          type="monotone"
          dataKey="baseline"
          stroke="#3e43c8"
          strokeWidth={2.5}
          dot={false}
          isAnimationActive={false}
          name={copy.fx.legend.today}
        />
        <Line
          type="monotone"
          dataKey="worst"
          stroke="#c2418f"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          isAnimationActive={false}
          name={copy.fx.legend.worst}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
