import type { Context, EngineDeps, FxData, PageSchool } from "./contract";
import { createEngine } from "./engine";

/*
 * The browser entry: window.TPEngine, data from this site's API routes (which hold the keys).
 * A failed load leaves that source missing; the engine then labels its lines as estimates,
 * exactly as the server does.
 */
declare const __ENGINE_VERSION__: string;

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const deps: EngineDeps = {
  async loadContext(school: PageSchool): Promise<Context> {
    const q = new URLSearchParams({
      unitId: String(school.unitId),
      zip: school.zip,
      state: school.state,
      city: school.city,
    });
    const data = await getJson<Context>(`/api/context?${q}`);
    return data ?? { school: null, rent: null, demo: false };
  },
  async loadFx(currency: string): Promise<FxData> {
    const data = await getJson<FxData>(`/api/fx/history?currency=${encodeURIComponent(currency)}`);
    return data ?? { today: null, history: [] };
  },
};

declare global {
  interface Window {
    TPEngine: ReturnType<typeof createEngine>;
  }
}

window.TPEngine = createEngine(deps, __ENGINE_VERSION__);
