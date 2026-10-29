# ADR 001: We never predict exchange rates

**Context.** Families want to know what their currency will do. The evidence (Meese & Rogoff
1983; Rossi 2013) is that short-horizon exchange-rate moves can't be forecast better than
"no change".

**Decision.** The product shows what has happened over past periods of the same length as the
degree, replayed onto today's rate, as a range. No forecasts. Copy never uses "will",
"forecast" or "expected" about rates; a test greps the copy file for those words.

**Alternatives.** Show a single converted total (hides the risk); show a forecast (false
precision).

**Consequences.** The headline is a band, which is less tidy than one number. The what-if
slider lets people explore their own assumptions without us making one.
