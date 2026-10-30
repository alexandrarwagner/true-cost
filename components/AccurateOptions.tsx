"use client";

import { copy } from "@/content/copy";
import type { EstimateRequestInput } from "@/lib/schema/estimate";
import { HousingOptions } from "./HousingOptions";

type Options = NonNullable<EstimateRequestInput["options"]>;
type Housing = NonNullable<Options["housing"]>;

interface Props {
  value: Options;
  onChange: (next: Options) => void;
}

const field =
  "mt-1 w-full border border-neutral-900 bg-white px-3 py-2 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-900";
const num = (v: string): number | undefined => (v.trim() === "" ? undefined : Number(v));

export function AccurateOptions({ value, onChange }: Props) {
  const t = copy.form;
  const housing: Housing = value.housing ?? { kind: "on_campus", bedrooms: 1, roommates: 0 };
  const set = (patch: Partial<Options>) => onChange({ ...value, ...patch });

  return (
    <details className="mt-6 border border-neutral-300 p-3">
      <summary className="cursor-pointer font-medium">{t.accurate}</summary>
      <p className="mt-2 text-sm text-neutral-700">{t.accurateIntro}</p>

      <HousingOptions value={housing} onChange={(h) => onChange({ ...value, housing: h })} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          {t.scholarship}
          <input
            type="number"
            min={0}
            className={field}
            value={value.scholarshipPerYear ?? ""}
            onChange={(e) => set({ scholarshipPerYear: num(e.target.value) })}
          />
        </label>
        <label className="block">
          {t.enrolmentDeposit}
          <input
            type="number"
            min={0}
            className={field}
            value={value.enrolmentDeposit ?? ""}
            onChange={(e) => set({ enrolmentDeposit: num(e.target.value) })}
          />
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className="font-medium">{t.insurance}</legend>
        <div className="mt-1 flex flex-wrap gap-6">
          {(["school_plan", "waiver"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2">
              <input
                type="radio"
                name="insuranceKind"
                className="h-4 w-4"
                checked={(value.insurance?.kind ?? "school_plan") === k}
                onChange={() => set({ insurance: { ...(value.insurance ?? {}), kind: k } })}
              />
              {k === "school_plan" ? t.insuranceSchool : t.insuranceWaiver}
            </label>
          ))}
        </div>
        <label className="mt-2 block sm:w-1/2">
          {t.insurancePremium}
          <input
            type="number"
            min={0}
            className={field}
            value={value.insurance?.premiumPerYear ?? ""}
            onChange={(e) =>
              set({
                insurance: {
                  kind: value.insurance?.kind ?? "school_plan",
                  premiumPerYear: num(e.target.value),
                },
              })
            }
          />
        </label>
      </fieldset>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          {t.tripsHome}
          <input
            type="number"
            min={0}
            max={6}
            className={field}
            value={value.flights?.tripsHomePerYear ?? 1}
            onChange={(e) =>
              set({
                flights: { ...(value.flights ?? {}), tripsHomePerYear: Number(e.target.value) },
              })
            }
          />
        </label>
        <label className="block">
          {t.oneWayFare}
          <input
            type="number"
            min={0}
            className={field}
            value={value.flights?.oneWay ?? ""}
            onChange={(e) =>
              set({
                flights: {
                  tripsHomePerYear: value.flights?.tripsHomePerYear ?? 1,
                  oneWay: num(e.target.value),
                },
              })
            }
          />
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className="font-medium">{t.transfer}</legend>
        <p className="text-sm text-neutral-700">{t.transferHint}</p>
        <div className="mt-1 grid gap-3 sm:grid-cols-2">
          <label className="block">
            {t.transferMarkup}
            <input
              type="number"
              min={0}
              max={20}
              step={0.1}
              className={field}
              value={value.transfer ? value.transfer.markupBps / 100 : ""}
              onChange={(e) => {
                const pct = num(e.target.value);
                set({
                  transfer:
                    pct === undefined
                      ? undefined
                      : {
                          markupBps: Math.round(pct * 100),
                          fixedFee: value.transfer?.fixedFee ?? 0,
                        },
                });
              }}
            />
          </label>
          <label className="block">
            {t.transferFee}
            <input
              type="number"
              min={0}
              className={field}
              value={value.transfer?.fixedFee ?? ""}
              onChange={(e) => {
                const fee = num(e.target.value);
                set({
                  transfer:
                    fee === undefined && !value.transfer
                      ? undefined
                      : { markupBps: value.transfer?.markupBps ?? 0, fixedFee: fee ?? 0 },
                });
              }}
            />
          </label>
        </div>
        <label className="mt-2 flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={value.payFromUsd === true}
            onChange={(e) => set({ payFromUsd: e.target.checked || undefined })}
          />
          {t.payFromUsd}
        </label>
      </fieldset>

      <label className="mt-4 block sm:w-1/2">
        {t.dependants}
        <input
          type="number"
          min={0}
          max={6}
          className={field}
          value={value.dependants ?? ""}
          onChange={(e) => set({ dependants: num(e.target.value) })}
        />
      </label>
    </details>
  );
}
