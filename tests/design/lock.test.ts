import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * The design lock. The designer's page (design/wired/E-homepage-wired.html) may differ from
 * the file as delivered (tests/design/baseline.html) only by the edits listed in
 * allowed-diffs.json, each of which the owner approved. Any other difference fails here.
 */
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

interface Allowed {
  change: string;
  from: string;
  to: string;
}

describe("design lock", () => {
  const baseline = read("tests/design/baseline.html");
  const page = read("design/wired/E-homepage-wired.html");
  const allowed = JSON.parse(read("tests/design/allowed-diffs.json")) as Allowed[];

  it("every allowed edit applies exactly once to the delivered file", () => {
    for (const a of allowed) {
      expect(baseline.split(a.from).length - 1, a.change).toBe(1);
    }
  });

  it("the page is the delivered file plus the allowed edits, nothing else", () => {
    let expected = baseline;
    for (const a of allowed) expected = expected.replace(a.from, a.to);
    const where = firstDifference(expected, page);
    expect(where, where ? `first unexpected difference near line ${where.line}:\n${where.excerpt}` : "")
      .toBeNull();
  });
});

function firstDifference(a: string, b: string): { line: number; excerpt: string } | null {
  if (a === b) return null;
  const la = a.split("\n");
  const lb = b.split("\n");
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) {
      return {
        line: i + 1,
        excerpt: `expected: ${(la[i] ?? "<end of file>").slice(0, 160)}\n   found: ${(lb[i] ?? "<end of file>").slice(0, 160)}`,
      };
    }
  }
  return { line: 0, excerpt: "files differ only in trailing content" };
}
