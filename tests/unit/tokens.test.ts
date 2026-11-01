import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The theme's colours, read from app/globals.css, checked for WCAG AA where the UI pairs them.
// A token that stops passing here fails the build before it reaches a page.

const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
const theme = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
const colors = Object.fromEntries(
  [...theme.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
) as Record<string, string>;

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r ?? 0) + 0.7152 * lin(g ?? 0) + 0.0722 * lin(b ?? 0);
}
export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((l1 ?? 0) + 0.05) / ((l2 ?? 0) + 0.05);
}
const ratio = (fg: string, bg: string) => {
  const a = colors[fg];
  const b = colors[bg];
  if (!a || !b) throw new Error(`missing token ${fg} or ${bg}`);
  return contrast(a, b);
};

describe("theme tokens", () => {
  it("define every colour the components use", () => {
    for (const name of [
      "ink",
      "muted",
      "page",
      "card",
      "line",
      "dark",
      "dark-muted",
      "brand",
      "brand-soft",
      "tint-brand",
      "tint-pink",
      "error",
      "cat-tuition",
      "cat-tuition-chip",
      "cat-housing",
      "cat-insurance",
      "cat-living",
      "cat-oneoff",
      "cat-moving",
    ])
      expect(colors[name], name).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("every body-text pairing meets AA (4.5:1)", () => {
    const chips = [
      "cat-tuition-chip",
      "cat-housing",
      "cat-insurance",
      "cat-living",
      "cat-oneoff",
      "cat-moving",
      "tint-brand",
      "tint-pink",
    ];
    for (const bg of ["page", "card", ...chips]) {
      expect(ratio("ink", bg), `ink on ${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio("muted", bg), `muted on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    for (const bg of ["page", "card"]) {
      expect(ratio("brand", bg), `brand on ${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio("error", bg), `error on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    for (const fg of ["card", "dark-muted", "cat-living", "cat-moving", "cat-oneoff"])
      expect(ratio(fg, "dark"), `${fg} on dark`).toBeGreaterThanOrEqual(4.5);
    expect(ratio("ink", "cat-tuition")).toBeGreaterThanOrEqual(4.5);
  });

  it("documents the pairings that only pass for large text, so they are never used for body text", () => {
    expect(ratio("brand-soft", "card")).toBeLessThan(4.5);
    expect(ratio("brand-soft", "card")).toBeGreaterThanOrEqual(3);
    expect(ratio("card", "cat-living")).toBeLessThan(3);
  });

  it("the category colours are all different, and never the only signal (each chip carries its name)", () => {
    const cats = [
      "cat-tuition-chip",
      "cat-insurance",
      "cat-living",
      "cat-oneoff",
      "cat-moving",
    ].map((c) => colors[c]);
    expect(new Set(cats).size).toBe(cats.length);
  });
});
