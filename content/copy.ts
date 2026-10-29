// ALL user-facing text lives in this file, at about an 8th-grade reading level.
// Screens arrive in build step 4; step 2 holds only what the server needs.

import type { ErrorCode } from "@/lib/schema/api";

export const copy = {
  siteName: "True Cost",
  tagline: "What studying in the US will really cost you, in your own money.",
  disclaimer:
    "This is an estimate, not financial advice. We don't predict exchange rates and we don't recommend any bank or transfer service.",
  errors: {
    INVALID_INPUT: "We couldn't read that. Check the details and try again.",
    PAYLOAD_TOO_LARGE: "That's more text than we can take at once. Try a shorter version.",
    RATE_LIMITED:
      "You've made a lot of requests in a short time. Please wait a minute and try again.",
    FORBIDDEN_ORIGIN: "This request didn't come from the True Cost site.",
    DATA_UNAVAILABLE:
      "One of our data sources isn't answering right now. Please try again in a moment.",
    UPSTREAM_TIMEOUT: "That took too long. Please try again in a moment.",
    INTERNAL: "Something went wrong on our side. Please try again.",
  } satisfies Record<ErrorCode, string>,
  privacy: {
    title: "Privacy",
    sections: [
      {
        heading: "What's sent where",
        body: [
          "When you search for a school, the name you type is sent to the US Department of Education's College Scorecard to find matches.",
          "Today's exchange rate comes from a public rates service. We send it the currency codes only.",
          "If you paste text from an offer letter or I-20, that text is sent to Anthropic's API to pull out the numbers. You see what it found and confirm it before anything is used.",
        ],
      },
      {
        heading: "What's stored",
        body: [
          "Nothing. We have no accounts and no database of users. Your inputs live in the page and, if you share a result, in the link itself. The link holds your country, school, tuition and options, never your name or anything personal.",
          "Our logs record which page was used, whether it worked, and how long it took. Never what you typed or pasted.",
        ],
      },
      {
        heading: "What this isn't",
        body: [
          "This is not financial advice. Every number is an estimate with a source you can check. We don't predict exchange rates and we don't recommend providers.",
        ],
      },
    ],
  },
} as const;
