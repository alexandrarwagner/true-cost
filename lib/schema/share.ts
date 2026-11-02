import {
  CompareRequestSchema,
  MAX_COMPARE,
  toCompareRequest,
  toEstimateRequests,
  type CompareRequest,
  type CompareSchool,
} from "./compare";
import { EstimateRequestSchema, type EstimateRequest } from "./estimate";
import { encodeShare, setSchool } from "./shareEncode";

export { encodeShare };

// Shareable URLs carry the inputs only, never personal data. One short param per field.
// A comparison adds the extra schools with a numeric suffix: s2, sn2, ... t3, ts3.

function getSchool(p: URLSearchParams, suffix = ""): unknown {
  return {
    school: {
      unitId: Number(p.get(`s${suffix}`)),
      name: p.get(`sn${suffix}`) ?? "",
      city: p.get(`sc${suffix}`) ?? "",
      state: p.get(`st${suffix}`) ?? "",
      zip: p.get(`sz${suffix}`) ?? "",
    },
    tuitionPerYear: Number(p.get(`t${suffix}`)),
    tuitionSource: p.get(`ts${suffix}`) ?? "user",
  };
}

/** Longer links are refused outright: custom-cost labels travel in them, so this bounds abuse. */
export const MAX_SHARE_QUERY = 2000;

export function decodeShare(params: URLSearchParams): EstimateRequest | null {
  if (params.toString().length > MAX_SHARE_QUERY) return null;
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
    ...(getSchool(params) as object),
    degreeYears: Number(params.get("y")),
    startTerm: { year: Number(params.get("sy")), season: params.get("ss") ?? "" },
    options,
    levers: (params.get("lv") ?? "").split(",").filter(Boolean),
    example: params.get("ex") === "1",
  };
  const parsed = EstimateRequestSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/** The first school's share params, then each extra school with its suffix. */
export function encodeCompareShare(req: CompareRequest): URLSearchParams {
  const [primary, ...extras] = toEstimateRequests(req);
  if (!primary) return new URLSearchParams();
  const p = encodeShare(primary);
  extras.forEach((s, i) => setSchool(p, s, String(i + 2)));
  return p;
}

/** Null unless the params hold a valid primary estimate and at least one valid extra school. */
export function decodeCompareShare(params: URLSearchParams): CompareRequest | null {
  const primary = decodeShare(params);
  if (!primary) return null;
  const extras: unknown[] = [];
  for (let n = 2; n <= MAX_COMPARE; n++)
    if (params.has(`s${n}`)) extras.push(getSchool(params, String(n)));
  if (extras.length === 0) return null;
  const parsed = CompareRequestSchema.safeParse(
    toCompareRequest(primary, extras as CompareSchool[]),
  );
  return parsed.success ? parsed.data : null;
}
