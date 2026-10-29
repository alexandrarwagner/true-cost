import { EstimateRequestSchema, type EstimateRequest } from "./estimate";

// Shareable URLs carry the inputs only, never personal data. One short param per field.

export function encodeShare(req: EstimateRequest): URLSearchParams {
  const p = new URLSearchParams();
  p.set("c", req.countryCode);
  p.set("cur", req.homeCurrency);
  p.set("s", String(req.school.unitId));
  p.set("sn", req.school.name);
  p.set("sc", req.school.city);
  p.set("st", req.school.state);
  p.set("sz", req.school.zip);
  p.set("t", String(req.tuitionPerYear));
  p.set("ts", req.tuitionSource);
  p.set("y", String(req.degreeYears));
  p.set("sy", String(req.startTerm.year));
  p.set("ss", req.startTerm.season);
  if (Object.keys(req.options).length > 0) p.set("o", JSON.stringify(req.options));
  return p;
}

export function decodeShare(params: URLSearchParams): EstimateRequest | null {
  let options: unknown = {};
  const o = params.get("o");
  if (o) {
    try {
      options = JSON.parse(o);
    } catch {
      return null;
    }
  }
  const candidate = {
    countryCode: params.get("c") ?? "",
    homeCurrency: params.get("cur") ?? "",
    school: {
      unitId: Number(params.get("s")),
      name: params.get("sn") ?? "",
      city: params.get("sc") ?? "",
      state: params.get("st") ?? "",
      zip: params.get("sz") ?? "",
    },
    tuitionPerYear: Number(params.get("t")),
    tuitionSource: params.get("ts") ?? "user",
    degreeYears: Number(params.get("y")),
    startTerm: { year: Number(params.get("sy")), season: params.get("ss") ?? "" },
    options,
  };
  const parsed = EstimateRequestSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
