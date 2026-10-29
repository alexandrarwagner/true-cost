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
import type { FxPathPoint } from "@/lib/core/types";
import { homeShort, monthYear, type CurrencyDisplay } from "@/lib/ui/format";

// Greyscale band chart: the best-to-worst tenth of past periods as a band, the median and
// today's-rate baseline as lines. Decorative: the table beside it carries the same numbers.
export function RangeChart({ path, currency }: { path: FxPathPoint[]; currency: CurrencyDisplay }) {
  const scale = Math.pow(10, currency.minorDigits);
  const data = path.map((p) => ({
    date: p.date,
    band: [p.best10 / scale, p.worst10 / scale],
    median: p.median / scale,
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
        <CartesianGrid stroke="#d4d4d4" strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={monthYear} stroke="#171717" fontSize={12} />
        <YAxis tickFormatter={fmt} stroke="#171717" fontSize={12} width={90} />
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
          fill="#a3a3a3"
          fillOpacity={0.4}
          isAnimationActive={false}
          name="Best to worst tenth"
        />
        <Line
          type="monotone"
          dataKey="median"
          stroke="#171717"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          name="Median"
        />
        <Line
          type="monotone"
          dataKey="baseline"
          stroke="#171717"
          strokeDasharray="5 4"
          dot={false}
          isAnimationActive={false}
          name="Today's rate"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
