// A small TTL cache for lookups keyed by domain. Never cache anything containing user text.
// In-memory only: fine for one server process, and good enough for a short TTL.

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export class TtlCache<V> {
  private readonly entries = new Map<string, Entry<V>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    if (this.entries.size >= this.maxEntries) {
      // Map iterates in insertion order, so the first key is the oldest.
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }

  get size(): number {
    return this.entries.size;
  }
}
