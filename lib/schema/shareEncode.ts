// The share-link encoder on its own, with no schema import, so the browser engine can build a
// link to the full calculation without bundling zod. share.ts re-exports it for the server.

export interface ShareableSchool {
  school: { unitId: number; name: string; city: string; state: string; zip: string };
  tuitionPerYear: number;
  tuitionSource: "school" | "user";
}

export interface ShareableRequest extends ShareableSchool {
  countryCode: string;
  homeCurrency: string;
  degreeYears: number;
  startTerm: { year: number; season: "fall" | "spring" };
  options: Record<string, unknown>;
  levers: string[];
  example?: boolean;
}

export function setSchool(p: URLSearchParams, s: ShareableSchool, suffix = ""): void {
  p.set(`s${suffix}`, String(s.school.unitId));
  p.set(`sn${suffix}`, s.school.name);
  p.set(`sc${suffix}`, s.school.city);
  p.set(`st${suffix}`, s.school.state);
  p.set(`sz${suffix}`, s.school.zip);
  p.set(`t${suffix}`, String(s.tuitionPerYear));
  p.set(`ts${suffix}`, s.tuitionSource);
}

export function encodeShare(req: ShareableRequest): URLSearchParams {
  const p = new URLSearchParams();
  p.set("c", req.countryCode);
  p.set("cur", req.homeCurrency);
  setSchool(p, req);
  p.set("y", String(req.degreeYears));
  p.set("sy", String(req.startTerm.year));
  p.set("ss", req.startTerm.season);
  if (Object.keys(req.options).length > 0) p.set("o", JSON.stringify(req.options));
  if (req.levers.length > 0) p.set("lv", req.levers.join(","));
  if (req.example) p.set("ex", "1");
  return p;
}
