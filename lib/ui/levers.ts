import type { LeverId } from "@/lib/core/levers";

/** The `lv` param with one lever toggled, for the no-JavaScript links on the shared page. */
export function toggledQuery(shareQuery: string, active: LeverId[], id: LeverId): string {
  const p = new URLSearchParams(shareQuery);
  const next = active.includes(id) ? active.filter((a) => a !== id) : [...active, id];
  if (next.length > 0) p.set("lv", next.join(","));
  else p.delete("lv");
  return p.toString();
}
