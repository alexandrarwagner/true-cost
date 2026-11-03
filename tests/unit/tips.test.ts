import { describe, expect, it, vi } from "vitest";
import { getTips, tipsKey, TipsSchema, type Tips } from "@/lib/server/tips";

const tips: Tips = {
  housing: [
    {
      title: "Share a place a stop out",
      text: "Rent drops away from the campus core. Sharing with two others usually halves it.",
    },
    {
      title: "Wait a week to buy furniture",
      text: "Students moving out give things away when leases turn over, so hold off at first.",
    },
  ],
  living: {
    title: "Cook together",
    text: "Sharing staples with flatmates and cooking most nights goes much further than eating out.",
  },
  moving: {
    title: "Send fewer, larger transfers",
    text: "Each transfer has a fee and a rate markup. Fewer, larger ones cost less over a year.",
  },
};

describe("tips", () => {
  it("keys a place without regard to case or spaces", () => {
    expect(tipsKey({ country: " India ", city: "New York", state: "ny" })).toBe(
      "india|new york|ny|",
    );
  });

  it("returns the model's tips once and caches them per place", async () => {
    const gen = vi.fn(async () => tips);
    const input = { country: "Nigeria", city: "Boston", state: "MA", school: "Boston University" };
    expect(await getTips(input, gen)).toEqual(tips);
    expect(await getTips(input, gen)).toEqual(tips);
    expect(gen).toHaveBeenCalledTimes(1);
  });

  it("falls back to null when the model fails or answers nothing", async () => {
    expect(
      await getTips({ country: "Peru" }, async () => {
        throw new Error("down");
      }),
    ).toBeNull();
    expect(await getTips({ country: "Chile" }, async () => null)).toBeNull();
  });

  it("accepts only two housing tips, one living and one moving, each short", () => {
    expect(TipsSchema.safeParse(tips).success).toBe(true);
    expect(TipsSchema.safeParse({ ...tips, housing: [tips.housing[0]] }).success).toBe(false);
  });
});
