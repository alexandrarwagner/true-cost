# ADR 006: Recharts for the exchange-rate band chart

**Context.** The brief allows Recharts or visx. Checked 29 Oct 2026: recharts has about 64M
weekly downloads and was published that day; @visx/xychart about 0.5M and last published in
June.

**Decision.** Recharts. Its area chart renders a band natively and it has the larger
community. The chart always has a text and table alternative, and respects
`prefers-reduced-motion`.

**Alternatives.** visx (lower-level, more work); hand-rolled SVG (more work still).

**Consequences.** One client-side charting dependency, loaded only on the result view.
