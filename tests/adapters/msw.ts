import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

// Shared MSW server for adapter tests. Any unhandled request is an error: adapters must
// never reach the network in tests.
export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

export const ctx = () => ({
  requestId: "t",
  signal: AbortSignal.timeout(5000),
  log: () => undefined,
});
