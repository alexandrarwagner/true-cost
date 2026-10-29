// Runs once when the server boots. Validates env so a misconfigured deployment fails fast
// with a clear message instead of failing on the first request.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv } = await import("@/lib/server/env");
    getEnv();
  }
}
