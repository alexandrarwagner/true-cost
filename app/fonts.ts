import { Archivo, Noto_Sans_Bengali } from "next/font/google";

// All fonts download at build time and serve from our origin, so font-src 'self' holds.

/**
 * Archivo without the width axis: 33-35 KB per file. The design's 112% display width needs
 * the axis, which was measured three ways and kept out each time: preloaded it doubled the
 * font bytes (performance 89-91); loaded late with swap it shifted every heading (CLS 0.147,
 * performance 83); loaded late as optional it still lengthened the simulated largest paint
 * (performance 88). See docs/accessibility-report.md.
 */
export const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

/** Only for the taka sign and Bengali digits; not preloaded. */
export const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: "500",
  variable: "--font-bengali",
  display: "swap",
  preload: false,
});
