import type { Page } from "@playwright/test";

/*
 * Freezing the designer's motion at a frame time, so a screenshot can be compared with the
 * frames under design/reference-v2/animation.
 *
 * Two clocks drive the page. JavaScript time (timers, requestAnimationFrame, performance.now:
 * the count-ups, the curtain's timers, the fan draw, the scroll-drawn line) runs on
 * Playwright's fake clock, advanced with `page.clock.runFor`. CSS animations and transitions
 * run on the browser's own timeline, which the fake clock does not touch; each one is paused
 * the first time it is seen and its currentTime set from the fake clock, so both clocks agree
 * to within one step. Animations created by a timer part-way through get their start time
 * from the step that first saw them.
 */
const STEP = 25;

/** In the page: pause every animation and set it to where the fake clock says it should be. */
const SYNC = `(() => {
  const now = performance.now();
  for (const a of document.getAnimations()) {
    const rec = a;
    if (rec.__tpStart === undefined) rec.__tpStart = now;
    a.pause();
    a.currentTime = Math.max(0, now - rec.__tpStart);
  }
})()`;

/** Marks "now" as the start of a motion: animations already running are left where they are. */
export async function anchor(page: Page): Promise<void> {
  await page.evaluate(SYNC);
}

/** Advances both clocks from the last anchor or frame to `t` milliseconds after the anchor. */
export async function freezeAt(page: Page, from: number, t: number): Promise<void> {
  for (let v = from; v < t; v += STEP) {
    await page.clock.runFor(Math.min(STEP, t - v));
    await page.evaluate(SYNC);
  }
}

export const frameName = (motion: string, t: number) => `${motion}-${String(t).padStart(4, "0")}ms`;

/** The frame times the designer captured, per motion (design/reference-v2/animation). */
export const FRAMES: Record<string, number[]> = {
  intro: [0, 150, 300, 500, 700, 900, 1200, 1600, 2200],
  reveal: [0, 150, 300, 500, 750, 1000, 1300, 1700, 2200, 3000, 4000],
  "refine-open": [0, 100, 250, 400, 600],
  fx: [0, 200, 400, 700, 1200, 2000],
  how: [0, 200, 400, 700, 1200, 2000],
  save: [0, 200, 400, 700, 1200, 2000],
  where: [0, 200, 400, 700, 1200, 2000],
  "navpill-fx": [0, 150, 300, 600],
  "navpill-save": [0, 150, 300, 600],
  "navpill-where": [0, 150, 300, 600],
};
