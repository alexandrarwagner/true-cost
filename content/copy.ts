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
  // Line items, by id. Plain words, no jargon.
  items: {
    tuition: "Tuition and fees",
    enrolmentDeposit: "Enrolment deposit",
    books: "Books and supplies",
    roomAndBoard: "Room and meals on campus",
    rent: "Rent",
    food: "Groceries",
    securityDeposit: "Security deposit",
    depositDeductions: "Deposit deductions (a risk, not a cost)",
    lastMonthRentUpfront: "Last month's rent, paid upfront",
    summerRent: "Rent over the summer",
    overlapRent: "Rent after the programme ends (lease overlap)",
    tempAccommodation: "Somewhere to stay before the lease starts",
    otherExpenses: "Personal expenses",
    healthInsurance: "Health insurance",
    dependantInsurance: "Health insurance for dependants",
    flightToSchool: "Flight to the school",
    flightsHome: "Trips home",
    finalFlight: "Flight home at the end",
    visaApplication: "Visa application fee",
    sevisFee: "SEVIS I-901 fee",
    visaIntegrityFee: "Visa Integrity Fee (may apply)",
    preDeparture: "Medical, vaccinations and documents",
    homeSetup: "Setting up a home",
    phoneSetup: "Phone and SIM",
    transportCard: "Local transport card",
    winterClothing: "Winter clothing",
    shippingHome: "Shipping things home",
    transferFees: "Transfer markups and fees",
  } as Record<string, string>,
  notes: {
    scholarship_applied: "Your scholarship has been taken off the tuition.",
    scholarship_exceeds_tuition:
      "Your scholarship is more than the tuition, so tuition is shown as zero. Check with the school whether the extra covers living costs.",
    deposit_credited_to_tuition: "Paid early and taken off the first tuition bill.",
    deposit_rules_vary: "Deposit rules vary by state. One month's rent is typical.",
    fmr_is_40th_percentile:
      "Based on HUD's Fair Market Rent: the rent that 40% of standard units in the area cost less than.",
    summer_rent: "On a 12-month lease, rent is still due over the summer. This is often missed.",
    insurance_waived:
      "You said you'll waive the school plan. Make sure your own cover meets the school's rules.",
    may_apply:
      "Being rolled out post by post and described as refundable in theory. Budget for it.",
    no_school_housing_figure:
      "The school hasn't published a housing figure, so this is our estimate.",
    no_area_rent: "We don't have rent data for this area yet, so this is our estimate.",
    pay_from_usd: "Paying from a dollar account means exchange rates don't change your total.",
    transfer_assumption:
      "Transfer costs use an illustrative markup and fee. Enter your provider's real numbers to make this exact.",
  } as Record<string, string>,
  categories: {
    tuition: "Tuition",
    housing: "Housing",
    living: "Living costs",
    one_off: "One-off costs",
    money_moving: "Moving the money",
  },
  phases: {
    pre_arrival: "Before you leave",
    arrival: "When you arrive",
    ongoing: "During the programme",
    departure: "When you leave",
  },
  confidence: {
    user: "Your input",
    school: "School-reported",
    government: "Government data",
    estimate: "Our estimate",
  },
  fx: {
    notPrediction:
      "This isn't a prediction. It shows what happened in the past to families paying over the same length of time.",
    rangeLine: (low: string, high: string) => `Your degree could cost between ${low} and ${high}.`,
    likePeriod: (start: string, end: string) =>
      `if the next period moves like ${start} to ${end} did`,
    whatYouCanDo:
      "What you can do: pay in dollars if you already have them, choose when you pay, or fix a rate. Some transfer services offer fixed-rate scheduled payments.",
    unsupported: {
      no_history:
        "Historical range not available for this currency yet. Today's conversion is shown.",
      history_too_short:
        "Not enough rate history for a programme this long. Today's conversion is shown.",
      pay_from_usd: "You're paying from a dollar account, so exchange rates don't apply.",
    },
    official_vs_market:
      "Official rates for this currency have at times differed a lot from what banks and transfer services actually offer.",
  },
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
