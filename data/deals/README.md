# Student deals

Hand-approved facts from source pages. Nothing here is generated at runtime, and the research
script (step 5) never writes `approved`: only a person does, after reading the source.

| Path                  | Holds                                                         |
| --------------------- | ------------------------------------------------------------- |
| `schools/<slug>.json` | `{ unitId, school, deals }`, every deal `scope: "school"`     |
| `city/<slug>.json`    | `{ city, state, deals }`, every deal `scope: "city"`          |
| `national.json`       | `{ deals }`, every deal `scope: "national"`, shown everywhere |
| `review/<slug>.json`  | Research output awaiting review; never read by the app        |

Rules (`lib/schema/deals.ts`, `npm run check:deals`):

- Every deal needs an `https` `sourceUrl`, a verbatim `sourceQuote` and a `checkedOn` date.
- Prices only when the source states both; the saving is `(regular − student) × periods`.
  Never a "typical" price. A deal without prices still shows, with no figure.
- Only `approved` deals render, and only for 90 days after `checkedOn`.
- Text and links only. No logos, no affiliate links, no provider recommendations.
