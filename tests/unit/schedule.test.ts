import { describe, expect, it } from "vitest";
import { buildLineItems } from "@/lib/core/costModel";
import { usd } from "@/lib/core/money";
import { buildSchedule } from "@/lib/core/schedule";
import { baseInput, LAFAYETTE_RENT, PURDUE, TODAY } from "../fixtures/inputs";

const transfer = { markupBps: 150, fixedFeeUsd: usd(15) };

describe("buildSchedule", () => {
  it("puts pre-arrival costs 90 days before the start, tuition per semester, and merges same-day payments", () => {
    const { items } = buildLineItems(baseInput(), { school: PURDUE }, TODAY);
    const events = buildSchedule(items, baseInput(), { transfer, payFromUsd: false });
    expect(events[0]).toMatchObject({ date: "2027-05-17", phase: "pre_arrival" });
    expect(events[0]?.itemIds).toEqual(
      expect.arrayContaining(["visaApplication", "sevisFee", "flightToSchool"]),
    );
    const tuitionEvents = events.filter((e) => e.itemIds.includes("tuition"));
    expect(tuitionEvents.map((e) => e.date)).toEqual([
      "2027-08-15",
      "2028-01-15",
      "2028-08-15",
      "2029-01-15",
    ]);
    expect(tuitionEvents.every((e) => e.amountUsd >= usd(28794 / 2))).toBe(true);
    expect(events.at(-1)?.phase).toBe("departure");
  });

  it("charges transfer markup and fee per event, and none when paying from USD", () => {
    const { items } = buildLineItems(baseInput(), { school: PURDUE }, TODAY);
    const withFees = buildSchedule(items, baseInput(), { transfer, payFromUsd: false });
    const noFees = buildSchedule(items, baseInput(), { transfer, payFromUsd: true });
    expect(
      withFees.every((e) => e.transferFeeUsd === Math.round(e.amountUsd * 0.015) + usd(15)),
    ).toBe(true);
    expect(noFees.every((e) => e.transferFeeUsd === 0)).toBe(true);
  });

  it("credits the enrolment deposit against the first tuition bill and the upfront last month against the final rent", () => {
    const input = baseInput({
      options: {
        enrolmentDepositUsd: usd(500),
        housing: { kind: "off_campus", bedrooms: 1, roommates: 0, lastMonthUpfront: true },
      },
    });
    const { items } = buildLineItems(input, { school: PURDUE, rent: LAFAYETTE_RENT }, TODAY);
    const events = buildSchedule(items, input, { transfer, payFromUsd: true });
    const firstTuition = events.find((e) => e.itemIds.includes("tuition"));
    // Semester-day payment: tuition net of deposit, half the books, per-year items, and the arrival
    // one-offs (deposit, last month upfront, home setup, phone, transport card, winter clothing).
    // Rent and groceries are dated the 1st of the month, so they sit in an earlier event.
    const arrivalOneOffs = usd(950) + usd(950) + usd(1200) + usd(60) + usd(50) + usd(300);
    expect(firstTuition?.amountUsd).toBe(
      usd(28794 / 2 - 500) + usd(1090 / 2) + usd(2340) + usd(2800) + arrivalOneOffs,
    );
    expect(events.find((e) => e.date === "2027-08-01")?.itemIds).toEqual(
      expect.arrayContaining(["rent", "food"]),
    );
    const lastRentMonth = events.filter((e) => e.itemIds.includes("rent")).at(-1);
    expect(lastRentMonth?.date).toBe("2029-04-01");
  });

  it("labels summer rent after the final year as overlap rent", () => {
    const input = baseInput({
      options: {
        housing: { kind: "off_campus", bedrooms: 1, roommates: 0, twelveMonthLease: true },
      },
    });
    const { items } = buildLineItems(input, { school: PURDUE, rent: LAFAYETTE_RENT }, TODAY);
    const events = buildSchedule(items, input, { transfer, payFromUsd: true });
    expect(events.some((e) => e.itemIds.includes("summerRent") && e.date === "2028-06-01")).toBe(
      true,
    );
    expect(
      events.some(
        (e) =>
          e.itemIds.includes("overlapRent") && e.date === "2029-06-01" && e.phase === "departure",
      ),
    ).toBe(true);
  });
});

describe("transfer cadence", () => {
  it("batches monthly living costs into one transfer per semester and summer, same total", () => {
    const monthly = baseInput({
      options: {
        housing: { kind: "off_campus", bedrooms: 1, roommates: 0, twelveMonthLease: true },
      },
    });
    const batched = {
      ...monthly,
      options: { ...monthly.options, transferCadence: "semester" as const },
    };
    const { items } = buildLineItems(monthly, { school: PURDUE, rent: LAFAYETTE_RENT }, TODAY);
    const a = buildSchedule(items, monthly, { transfer, payFromUsd: false });
    const b = buildSchedule(items, batched, { transfer, payFromUsd: false });
    const total = (evs: typeof a) => evs.reduce((s, e) => s + e.amountUsd, 0);
    expect(total(a)).toBe(total(b));
    expect(b.length).toBeLessThan(a.length);
    const rentDates = b.filter((e) => e.itemIds.includes("rent")).map((e) => e.date);
    expect(rentDates).toEqual(["2027-08-15", "2028-01-15", "2028-08-15", "2029-01-15"]);
    expect(b.filter((e) => e.itemIds.includes("summerRent"))).toHaveLength(1);
    const fees = (evs: typeof a) => evs.reduce((s, e) => s + e.transferFeeUsd, 0);
    expect(fees(b)).toBe(fees(a) - (a.length - b.length) * transfer.fixedFeeUsd);
  });
});
