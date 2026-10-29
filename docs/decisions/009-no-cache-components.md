# ADR 009: Cache Components off

**Context.** `create-next-app` for Next 16 enables Cache Components by default. The CSP uses a
per-request nonce, which requires dynamic rendering.

**Decision.** `cacheComponents: false`. Pages render per request. Caching of data happens in
our own API routes and snapshots, not in the page cache.

**Alternatives.** Keep Cache Components and opt pages into dynamic rendering (more concepts
for no benefit).

**Consequences.** No static shell. Pages are small and server-rendered.
