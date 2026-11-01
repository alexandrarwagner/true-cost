import type { Deal } from "@/lib/core/deals";

export const SPOTIFY: Deal = {
  id: "spotify-premium-student",
  title: "Spotify Premium Student",
  scope: "national",
  category: "subscriptions",
  studentPrice: { amount: 699, currency: "USD" },
  regularPrice: { amount: 1299, currency: "USD" },
  period: "month",
  eligibility: "Students at an accredited US college.",
  howToGet: "Sign up on Spotify's student page.",
  sourceUrl: "https://www.spotify.com/us/student/",
  sourceQuote: "just $6.99/month after. Spotify Premium Normally $12.99/month",
  checkedOn: "2026-10-31",
  status: "approved",
};

export const MUSEUMS: Deal = {
  id: "nyu-museum-gateway",
  title: "Free entry to New York museums with your NYU ID",
  scope: "school",
  category: "culture",
  eligibility: "NYU students with a valid NYU ID card.",
  howToGet: "Show your NYU ID.",
  sourceUrl: "https://www.nyu.edu/life/arts-culture-and-entertainment/free-museum-access.html",
  sourceQuote: "NYU's Museum Gateway gives students free admission",
  checkedOn: "2026-10-31",
  status: "approved",
};

/** A deal worth far more than the line it reduces, to test the cap. */
export const HUGE_FOOD: Deal = {
  ...SPOTIFY,
  id: "huge-food",
  title: "Huge food deal",
  category: "food",
  studentPrice: { amount: 0, currency: "USD" },
  regularPrice: { amount: 500_000, currency: "USD" },
};
