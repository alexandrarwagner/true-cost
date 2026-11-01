# 014. Deals are human-approved; AI drafts only

Date: 2026-10-31. Status: accepted.

## Context

Student deals change often and are easy to get wrong. An AI could draft them from the web, but
nothing it writes should reach a student unchecked, and a deal with no stated price should
never be given an invented saving.

## Decision

A deal is a record in `data/deals` with an https source URL, a verbatim quote from that page,
and the date a person checked it. Only `approved` deals render, and only for 90 days after the
check. A deal has a figure only when its source states both the student and the regular price;
otherwise it shows with no figure. Text and links only: no logos, no affiliate links. The
research script may draft candidates as `pending` after verifying the quote is on the page; it
never writes `approved`. Every deal shows "Checked on" and a "This deal ended" link carrying
only the deal id.

## Consequences

- Pages that hide their prices from a plain fetch (Amazon's, for one) cannot be verified by
  the weekly job, so such deals stay out or are hand-checked only.
- Coverage grows one checked school at a time; other schools see "We haven't checked deals for
  your school yet" plus national deals.
