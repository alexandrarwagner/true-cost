import { Archivo, Noto_Sans_Bengali } from "next/font/google";

// Both fonts are downloaded at build time and served from our origin, so the CSP's
// font-src 'self' holds and no request reaches Google at runtime.
export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

/** Only for the taka sign and Bengali digits; falls back to Archivo for everything else. */
export const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: "500",
  variable: "--font-bengali",
  display: "swap",
});
