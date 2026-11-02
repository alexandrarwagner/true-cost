import { describe, expect, it } from "vitest";
import { scriptPath, versionScripts } from "@/lib/server/scriptVersion";

describe("versioned script addresses", () => {
  it("adds each file's version to its address and leaves a missing file alone", () => {
    const html =
      '<script src="/wired/intro-flag.js"></script><script src="/engine.js"></script><script src="/wired/prototype/fan-calc.js"></script><script src="/other.js"></script>';
    const out = versionScripts(html, (src) => (src === "/engine.js" ? undefined : "abcd1234"));
    expect(out).toBe(
      '<script src="/wired/intro-flag.js?v=abcd1234"></script><script src="/engine.js"></script><script src="/wired/prototype/fan-calc.js?v=abcd1234"></script><script src="/other.js"></script>',
    );
  });

  it("maps addresses to the files they are served from", () => {
    expect(scriptPath("/wired/deals.js")).toMatch(/design\/wired\/deals\.js$/);
    expect(scriptPath("/engine.js")).toMatch(/public\/engine\.js$/);
  });
});
