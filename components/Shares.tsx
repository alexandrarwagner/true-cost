"use client";

import { useEffect, useRef, useState } from "react";
import { copy } from "@/content/copy";
import type { Category } from "@/lib/core/types";
import { home, homeFromUsd, homeShort, usdFmt } from "@/lib/ui/format";
import type { EstimateResponse } from "@/services/estimate";
import { CATEGORY_BG } from "./CategoryChip";

const ORDER: Category[] = [
  "tuition",
  "housing",
  "health_insurance",
  "living",
  "one_off",
  "money_moving",
];
/** The glow colour at each circle's edge, per the board (plum centre, cost colour edge). */
const EDGE: Record<Category, string> = {
  tuition: "#8f93f2",
  housing: "#c9cbfa",
  health_insurance: "#bfe3ff",
  living: "#ddff7a",
  one_off: "#f7b9ee",
  money_moving: "#9feada",
};

/* The board's composition on wide screens: the biggest circle left, the rest clustered right.
   Centres on a 1200 × 560 stage, by size rank; sizes come from the shares. */
const STAGE_W = 1200;
const STAGE_H = 560;
const SLOTS = [
  [340, 280],
  [722, 222],
  [846, 456],
  [970, 150],
  [1030, 330],
  [1055, 475],
];
const MAX_SIZE = 590;
const MIN_SIZE = 110;

interface Circle {
  category: Category;
  pct: number;
  size: number;
  shortLabel: string;
  fullLabel: string;
  delay: number;
}

/** Slot centres for the circles by rank, or null when any pair would touch. */
function place(circles: Circle[]): [number, number][] | null {
  const centres = circles.map((_, i) => SLOTS[i]).filter((s): s is number[] => s !== undefined);
  if (centres.length < circles.length) return null;
  for (let i = 0; i < circles.length; i++) {
    const [cx, cy] = centres[i] as [number, number];
    const r = (circles[i] as Circle).size / 2;
    if (cx - r < 0 || cy - r < 0 || cy + r > STAGE_H) return null;
    for (let j = i + 1; j < circles.length; j++) {
      const [ox, oy] = centres[j] as [number, number];
      const d = Math.hypot(cx - ox, cy - oy);
      if (d < r + (circles[j] as Circle).size / 2 + 8) return null;
    }
  }
  return centres as [number, number][];
}

/** True once the element has been in view; the circles grow in at that moment. */
function useSeen(ref: React.RefObject<HTMLElement | null>): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!("IntersectionObserver" in window)) {
      const t = setTimeout(() => setSeen(true), 0);
      return () => clearTimeout(t);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) setSeen(true);
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, seen]);
  return seen;
}

/* On the stage, sizes and positions are fractions of its width, so the whole composition scales
   with the container; in the fallback row they are pixels. */
function Bubble({ c, style }: { c: Circle; style?: React.CSSProperties }) {
  const big = c.size > 260;
  return (
    <div
      className="bub flex aspect-square flex-col items-center justify-center rounded-full text-center text-[#f4f5f7] transition-transform hover:scale-[1.08] focus:scale-[1.08]"
      style={{
        width: c.size,
        background: `radial-gradient(circle, #2a2340 40%, ${EDGE[c.category]} 100%)`,
        ...({ "--delay": `${c.delay}s` } as React.CSSProperties),
        ...style,
      }}
      tabIndex={0}
    >
      <span
        className="leading-none font-semibold tracking-[-0.04em] tabular-nums"
        style={{ fontSize: big ? 52 : c.size > 180 ? 34 : c.size > 120 ? 24 : 20 }}
      >
        {c.shortLabel}
      </span>
      <span className="mt-1.5 px-2 text-[13px] sm:text-[15px]">
        {copy.categories[c.category]} · {c.pct}%
      </span>
    </div>
  );
}

/**
 * "Where the money goes": the plum band. Circles whose area matches each share (the board's
 * default), or a bar list with the same numbers; the list is the accessible form and the
 * circles carry a text description.
 */
export function Shares({
  response,
  breakdownHref,
}: {
  response: EstimateResponse;
  breakdownHref: string;
}) {
  const t = copy.shares;
  const { estimate: e, currency: cur } = response;
  const [chart, setChart] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const seen = useSeen(stageRef);
  const rate = e.fx.today?.rate;
  const inHome = rate !== undefined && cur.code !== "USD" && !e.input.options.payFromUsd;
  const totals: Record<Category, number> = {
    tuition: e.totals.tuition,
    housing: e.totals.housing,
    health_insurance: e.totals.healthInsurance,
    living: e.totals.living,
    one_off: e.totals.oneOff,
    money_moving: e.totals.moneyMoving,
  };
  const total = Math.max(1, e.totals.total);
  const rows = ORDER.map((c) => ({
    category: c,
    usd: totals[c],
    pct: Math.round((totals[c] / total) * 100),
    shortLabel: inHome
      ? homeShort(homeFromUsd(totals[c] as never, rate, cur), cur)
      : usdFmt(totals[c] as never),
    fullLabel: inHome
      ? home(homeFromUsd(totals[c] as never, rate, cur), cur)
      : usdFmt(totals[c] as never),
  })).filter((r) => r.usd > 0);
  const parts = rows.map((r) => `${copy.categories[r.category]} ${r.pct}%`).join(", ");
  // Largest first, which is also the order they grow in.
  const circles: Circle[] = [...rows]
    .sort((a, b) => b.usd - a.usd)
    .map((r, i) => ({
      ...r,
      // Area matches the share; the smallest circles are enlarged so their label fits.
      size: Math.max(MIN_SIZE, Math.round(Math.sqrt(r.pct / 100) * MAX_SIZE)),
      delay: i * 0.12,
    }));
  const centres = place(circles);

  return (
    <section
      id="where"
      aria-labelledby="shares-heading"
      className="band mt-20 scroll-mt-24 bg-dark text-[#f4f5f7] lg:mt-40"
    >
      <div className="container py-16 lg:pt-30 lg:pb-[110px]">
        <div className="flex flex-wrap items-end justify-between gap-6 lg:gap-10">
          <h2 id="shares-heading" className="display max-w-[640px] text-4xl sm:text-display">
            {t.heading}
          </h2>
          <button
            type="button"
            aria-pressed={!chart}
            onClick={() => setChart((v) => !v)}
            className="inline-flex h-[52px] shrink-0 items-center rounded-pill border-[1.5px] border-[#f4f5f7] px-6 text-base text-[#f4f5f7] hover:bg-white/10"
          >
            {chart ? t.seeList : t.seeChart}
          </button>
        </div>

        {chart ? (
          <div
            ref={stageRef}
            role="img"
            aria-label={t.chartLabel(parts)}
            className={`bubbles mt-8 ${seen ? "is-in" : ""}`}
          >
            {centres && (
              <div
                className="relative hidden lg:block"
                style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}
              >
                {circles.map((c, i) => {
                  const [cx, cy] = centres[i] as [number, number];
                  return (
                    <Bubble
                      key={c.category}
                      c={c}
                      style={{
                        position: "absolute",
                        width: `${(c.size / STAGE_W) * 100}%`,
                        left: `${(cx / STAGE_W) * 100}%`,
                        top: `${(cy / STAGE_H) * 100}%`,
                        translate: "-50% -50%",
                      }}
                    />
                  );
                })}
              </div>
            )}
            <div
              className={`flex flex-wrap items-center justify-center gap-5 ${centres ? "lg:hidden" : "lg:justify-start lg:gap-6"}`}
            >
              {circles.map((c) => (
                <Bubble key={c.category} c={c} />
              ))}
            </div>
          </div>
        ) : (
          <ul className="mt-8">
            {rows.map((r) => (
              <li
                key={r.category}
                className="flex flex-col gap-2.5 border-t border-white/[0.14] py-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <a
                    href={`${breakdownHref}#${r.category}`}
                    className="text-[22px] font-semibold hover:underline"
                  >
                    {copy.categories[r.category]}
                  </a>
                  <span className="text-2xl font-semibold tabular-nums">{r.fullLabel}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-[6px] bg-white/[0.12]">
                  <div
                    className={`h-3 rounded-[6px] ${CATEGORY_BG[r.category]}`}
                    style={{ width: `${Math.max(1, r.pct)}%` }}
                  />
                </div>
                <p className="text-sm text-dark-muted">{t.share(r.pct)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
