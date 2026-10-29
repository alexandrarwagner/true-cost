import { describe, expect, it } from "vitest";
import { copy } from "@/content/copy";

// Principle 1: we never predict exchange rates. Copy about rates never says will, forecast or expected.
describe("copy rules", () => {
  it("never uses prediction words in the exchange-rate copy", () => {
    const text = JSON.stringify(copy.fx) + JSON.stringify(copy.notes);
    expect(text).not.toMatch(/\b(will|forecast|forecasts|expected)\b/i);
  });
  it("labels every line item", () => {
    for (const id of [
      "tuition",
      "rent",
      "summerRent",
      "overlapRent",
      "visaIntegrityFee",
      "transferFees",
    ])
      expect(copy.items[id]).toBeTruthy();
  });
});
