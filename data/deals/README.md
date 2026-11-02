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

## Research and review

- `npm run research:deals -- --national` (or `--school <unitId> --name "<school>" --city <city>
--state <ST>`, or `--city <city> --state <ST>`) asks Claude's web search for official pages,
  with coupon and forum sites blocked, fetches each page itself, extracts the deals it states
  with one call per page, and keeps a draft only when its quote is found verbatim on the page.
  Drafts land in `review/<target>-<date>.json` with `status: "pending"` and a `target`. Needs
  `ANTHROPIC_API_KEY` in `.env.local`; each run is a handful of calls.
- `npm run review:deals` shows each pending draft with its quote and link. Approve copies it
  into the live file for its target with `status: "approved"` and today's `checkedOn`; reject
  marks it; skip leaves it. A person pressing "a" is the only way a deal becomes approved.
- Then `npm run check:deals` and commit both files.
