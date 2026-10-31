import type { EstimateInput, EstimateOptions, HousingOptions } from "../types";

export const DEFAULT_HOUSING: HousingOptions = { kind: "on_campus", bedrooms: 1, roommates: 0 };

export const housingOf = (i: EstimateInput): HousingOptions => i.options.housing ?? DEFAULT_HOUSING;

export const withOptions = (i: EstimateInput, patch: Partial<EstimateOptions>): EstimateInput => ({
  ...i,
  options: { ...i.options, ...patch },
});

export const dependantsOf = (i: EstimateInput): number =>
  Math.max(0, Math.floor(i.options.dependants ?? 0));
