import "server-only";

// Outbound HTTP. Every request must target an allowlisted HTTPS host. User-supplied URLs
// are never fetched; the only user-derived values that reach these hosts are query parameters.

const ALLOWED_HOSTS: ReadonlySet<string> = new Set([
  "api.data.gov", // College Scorecard
  "www.huduser.gov", // HUD Fair Market Rents
  "api.frankfurter.dev", // exchange rates
  "api.anthropic.com",
  "challenges.cloudflare.com", // Turnstile verification
]);

export function isAllowedHost(host: string): boolean {
  return ALLOWED_HOSTS.has(host.toLowerCase());
}

export type UpstreamFailure =
  "blocked_host" | "timeout" | "aborted" | "network" | "too_large" | "http";

export class UpstreamError extends Error {
  constructor(
    public readonly kind: UpstreamFailure,
    public readonly host: string,
    public readonly status?: number,
  ) {
    super(`${kind}: ${host}${status ? ` (${status})` : ""}`);
    this.name = "UpstreamError";
  }
}

export interface SafeFetchOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  /** Outer signal (e.g. the request budget). Combined with the timeout. */
  signal?: AbortSignal;
  /** Retry once, with backoff and jitter, on a network error or 5xx. GET only. */
  retryOnce?: boolean;
}

const MAX_REDIRECTS = 3;

function backoffMs(): number {
  return 200 + Math.floor(Math.random() * 400);
}

async function attempt(url: URL, opts: SafeFetchOptions): Promise<Response> {
  const signals: AbortSignal[] = [AbortSignal.timeout(opts.timeoutMs ?? 5000)];
  if (opts.signal) signals.push(opts.signal);
  const signal = AbortSignal.any(signals);

  // Redirects are followed by hand so every hop is checked against the allowlist.
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== "https:" || !isAllowedHost(current.hostname)) {
      throw new UpstreamError("blocked_host", current.hostname);
    }
    let res: Response;
    try {
      res = await fetch(current, {
        method: opts.method ?? "GET",
        headers: opts.headers,
        body: opts.body,
        signal,
        redirect: "manual",
        cache: "no-store",
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError")
        throw new UpstreamError("timeout", current.host);
      if (err instanceof Error && err.name === "AbortError")
        throw new UpstreamError("aborted", current.host);
      throw new UpstreamError("network", current.host);
    }
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location && (opts.method ?? "GET") === "GET") {
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new UpstreamError("blocked_host", current.hostname);
      }
      current = next;
      continue;
    }
    return res;
  }
  throw new UpstreamError("network", current.hostname);
}

/**
 * fetch() restricted to allowlisted HTTPS hosts, with a hard timeout and at most one retry.
 * Throws UpstreamError; never returns a response from a non-allowlisted host.
 */
export async function safeFetch(url: URL, opts: SafeFetchOptions = {}): Promise<Response> {
  if (url.protocol !== "https:" || !isAllowedHost(url.hostname)) {
    throw new UpstreamError("blocked_host", url.hostname);
  }
  const retryable = opts.retryOnce === true && (opts.method ?? "GET") === "GET";
  try {
    const res = await attempt(url, opts);
    if (retryable && res.status >= 500 && !opts.signal?.aborted) {
      await new Promise((r) => setTimeout(r, backoffMs()));
      return attempt(url, opts);
    }
    return res;
  } catch (err) {
    const canRetry =
      retryable && err instanceof UpstreamError && err.kind === "network" && !opts.signal?.aborted;
    if (!canRetry) throw err;
    await new Promise((r) => setTimeout(r, backoffMs()));
    return attempt(url, opts);
  }
}

export const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

/** Read a JSON body with a size cap, so a misbehaving upstream can't exhaust memory. */
export async function readJsonCapped(
  res: Response,
  maxBytes = DEFAULT_MAX_RESPONSE_BYTES,
): Promise<unknown> {
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > maxBytes)
    throw new UpstreamError("too_large", new URL(res.url || "https://unknown").hostname);
  const reader = res.body?.getReader();
  if (!reader) return JSON.parse(await res.text()) as unknown;
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new UpstreamError("too_large", new URL(res.url || "https://unknown").hostname);
    }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(concat(chunks, received));
  return JSON.parse(text) as unknown;
}

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}
