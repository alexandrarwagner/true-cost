/*
 * Tuition+ engine adapter
 * -----------------------------------------------------------------------
 * The page (ui-and-animation.js) gets ALL of its numbers from this one
 * object: window.TPEngine. Nothing else on the page invents a figure.
 *
 * This file currently contains the PROTOTYPE logic (sample Boston prices,
 * INR only), moved here unchanged so the page looks and behaves exactly
 * as before. Claude Code replaces the INSIDE of estimate() and rates()
 * with the real cost engine (lib/core), keeping this contract:
 *
 * TPEngine.rates() -> { [currencyCode]: unitsPerUSD }
 *
 * TPEngine.estimate(input) -> Estimate
 *   input = {
 *     tuitionPerYearUsd: number,     // what the student typed
 *     years: number,                 // 1-6
 *     from: string,                  // country name typed/picked
 *     currency: string,              // ISO code shown in the currency chip, e.g. "INR"
 *     school: string,                // school name typed/picked (real engine: resolve to an ID)
 *     overrides: { house, live, one, move },   // the student's own numbers (USD/month or USD), null = use ours
 *     extras: [{ name, amt, freq: 'once'|'month' }]  // "Know a cost we missed?"
 *   }
 *   Estimate = {
 *     c:   { tui, house, live, one, move },   // category totals over the degree, USD
 *     tot: number,                             // total, USD
 *     exM: number, exO: number,                // extras per month / one-off, USD
 *     o:   { ... },                            // inputs echoed for the PDF and chart
 *     fx:  null | { lo, hi, buf, n, today:[], ... }   // past-rate replay, in home currency; null = not available
 *     meta: { sampleNote: string }             // line under "Tuition is where it starts."
 *   }
 * -----------------------------------------------------------------------
 */
window.TPEngine = (function () {
  const RATES = { INR: 95.35 }; // USD→INR, July 2026. Prototype: other currencies not connected.

  function rates() { return RATES; }

  function estimate(i) {
    const OV = i.overrides || {}, EX = i.extras || [];
    const T = i.tuitionPerYearUsd, Y = i.years;
    // PROTOTYPE SAMPLE VALUES (Boston). The real engine replaces these with sourced figures.
    const rentM = OV.house ?? 1500, liveM = OV.live ?? 600, one = OV.one ?? 6100;
    const exM = EX.filter(e => e.freq === 'month').reduce((a, e) => a + e.amt, 0);
    const exO = EX.filter(e => e.freq === 'once').reduce((a, e) => a + e.amt, 0);
    const c = { tui: T * Y, house: rentM * 12 * Y, live: (liveM + exM) * 12 * Y, one: one + exO };
    c.move = OV.move ?? Math.round((c.tui + c.house + c.live + c.one) * 2200 / 131500);
    const tot = c.tui + c.house + c.live + c.one + c.move;
    const o = { T, Y, rentM, liveM, one, extraOnce: exO, extraMonthly: exM, move: OV.move, rate: RATES.INR };
    const fx = (i.currency === 'INR' && window.fanCalc && window.FXV) ? window.fanCalc(window.FXV, o) : null;
    return { c, tot, exM, exO, o, fx, meta: { sampleNote: 'Housing and living use Boston prices as a sample' } };
  }

  return { version: 'prototype-1', rates, estimate };
})();
