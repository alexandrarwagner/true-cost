# Cost model

Every line item the engine produces, with its default. Amounts are integer US cents inside
the engine; this page shows dollars. "Estimate" items carry a band and are labelled as
estimates in the UI with a path to make them exact. Sources and dates live in
`data/constants.ts` and in the data snapshots.

## Inputs

Required: country (sets the home currency, editable), school (College Scorecard UNITID),
tuition per year in USD (pre-filled from Scorecard out-of-state tuition, always editable, with a
note that graduate tuition is usually different). Visible with one tap to change: degree length
(quick pick, no silent default) and start term (next fall).

## Line items

| Item                               | Phase        | Frequency                     | Default                                                                                                                                      | Confidence                   |
| ---------------------------------- | ------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Tuition and fees                   | ongoing      | per year, billed per semester | user input, net of scholarship (clamped at zero)                                                                                             | user / school                |
| Enrolment deposit                  | pre-arrival  | one-off                       | only if entered; credited against the first tuition bill (timing only)                                                                       | user                         |
| Books and supplies                 | ongoing      | per year, billed per semester | Scorecard `booksupply`, else $1,200 ($800 to $1,600)                                                                                         | school / estimate            |
| Room and meals on campus           | ongoing      | per year                      | Scorecard `roomboard.oncampus`, else $14,000 ($11,000 to $18,000)                                                                            | school / estimate            |
| Rent (off campus)                  | ongoing      | per month, 10 months a year   | HUD FMR for the bedroom count, divided by roommates + 1; user's own rent if known; else $1,300                                               | government / user / estimate |
| Groceries (off campus)             | ongoing      | per month                     | $400 ($300 to $550)                                                                                                                          | estimate                     |
| Security deposit (off campus)      | arrival      | one-off                       | one month's rent; rules vary by state                                                                                                        | estimate                     |
| Deposit deductions                 | departure    | one-off                       | shown as a risk from $0 to one month's rent; not counted                                                                                     | risk                         |
| Last month's rent upfront          | arrival      | one-off                       | if the landlord asks; covers the final month (timing only)                                                                                   | user                         |
| Rent over the summer               | ongoing      | per month, 2 months a year    | rent, only on a 12-month lease                                                                                                               | as rent                      |
| Rent after the programme ends      | departure    | per month                     | the final year's summer months on a 12-month lease                                                                                           | as rent                      |
| Somewhere to stay before the lease | arrival      | one-off                       | nights × $80 ($50 to $150)                                                                                                                   | estimate                     |
| Personal expenses                  | ongoing      | per year                      | Scorecard `otherexpense` for the housing kind, else $2,500 ($1,500 to $4,000)                                                                | school / estimate            |
| Health insurance                   | ongoing      | per year                      | school premium if entered; $2,800 ($2,000 to $4,000); $0 with a waiver                                                                       | user / estimate              |
| Health insurance for dependants    | ongoing      | per year                      | $2,500 per F-2 dependant ($1,500 to $4,000)                                                                                                  | estimate                     |
| Flight to the school               | pre-arrival  | one-off                       | by region: South Asia $1,000, East Asia $900, Southeast Asia $1,100, North America $300, Africa $1,300, South America $900, each with a band | estimate / user              |
| Trips home                         | ongoing      | per year                      | trips × 2 × one-way fare; default one trip                                                                                                   | estimate / user              |
| Flight home at the end             | departure    | one-off                       | one-way fare                                                                                                                                 | estimate / user              |
| Visa application fee (MRV)         | pre-arrival  | one-off                       | $185 per applicant, including each dependant                                                                                                 | government                   |
| SEVIS I-901 fee                    | pre-arrival  | one-off                       | $350, once                                                                                                                                   | government                   |
| Visa Integrity Fee                 | pre-arrival  | one-off                       | $250 per applicant, labelled "may apply"                                                                                                     | government                   |
| Medical, vaccinations, documents   | pre-arrival  | one-off                       | $300 ($150 to $500)                                                                                                                          | estimate                     |
| Setting up a home                  | arrival      | one-off                       | $1,200 unfurnished ($800 to $2,000); $450 furnished or on campus ($300 to $700)                                                              | estimate                     |
| Phone and SIM                      | arrival      | one-off                       | $60 ($30 to $100)                                                                                                                            | estimate                     |
| Local transport card               | arrival      | one-off                       | $50 ($20 to $100)                                                                                                                            | estimate                     |
| Winter clothing                    | arrival      | one-off                       | $300 ($200 to $500), only in cold states                                                                                                     | estimate                     |
| Shipping things home               | departure    | one-off                       | $350 ($200 to $600)                                                                                                                          | estimate                     |
| Transfer markups and fees          | each payment | per transfer                  | 1.5% markup plus $15 per transfer, labelled as an assumption; none when paying from USD                                                      | estimate / user              |

## Calendar

Fall starts 15 August, spring 10 January. Each academic year has two semesters, ten living
months and two summer months. Pre-arrival costs fall 90 days before the start. The programme
ends ten days before the month after the last living month. Same-day payments merge into one
transfer, which is how families pay.

## Totals

Per-year items count once per year, per-semester twice, per-month ten times (summer rent twice),
one-offs once. Timing-only and risk items are excluded. "Hidden costs" is everything except
tuition as a percentage of tuition.

## Exchange-rate range

See ADR 001. For every window in the history as long as the payment plan (sampled weekly), each
payment is converted at today's rate scaled by that window's relative move at the payment's
offset. The UI shows the median, the best and worst 10%, the single worst window ("if the next
two years move like 2013 to 2015 did"), and a what-if slider that moves the rate in a straight
line to a chosen change by the last payment. Paying from a US dollar account removes the range.
Currencies without enough history show today's conversion only.

## Levers

"Ways to lower this number" never adds savings up. Each lever is a counterfactual: one change
to the inputs, a full re-run of the engine, and the difference against the baseline total. The
levers in v1 are living on campus, sharing with one or two roommates, skipping summer rent,
using your own health cover (a figure only when the school is known to allow waivers and the
user entered their own premium), sending money once a semester, comparing the transfer markup
against a reference value, and one fewer trip home a year. A lever shows only when it applies
and saves more than `SAVINGS_MIN_USD` over the degree; levers that conflict exclude each other;
with several switched on, the page shows one combined scenario. Student deals are levers of the
same kind: a priced deal takes the source's stated saving off its cost line, capped at what the
line costs, and the engine re-runs. See ADR 013 and ADR 014.

## Derivations

Every line item carries a `derivation`: the formula and the terms it was computed from, built by
the same call that produced the amount (`lib/core/derive.ts`), so the full-calculation page can
print "$3,100 ÷ 3 people = $1,033" and never disagree with the total. Every source names an id
in the registry at `data/sources.ts`, which also generates the methodology table. See ADR 015.
