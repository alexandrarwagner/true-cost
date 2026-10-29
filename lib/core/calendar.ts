import type { DegreeYears, IsoDate, Phase, Season } from "./types";

// Academic calendar. Deliberately simple: two semesters, ten living months, two summer months.
export const ACADEMIC_MONTHS_PER_YEAR = 10;
export const SUMMER_MONTHS_PER_YEAR = 2;
export const SEMESTERS_PER_YEAR = 2;
export const PRE_ARRIVAL_DAYS_BEFORE_START = 90;

export function iso(year: number, month1: number, day: number): IsoDate {
  const d = new Date(Date.UTC(year, month1 - 1, day));
  return d.toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(date: IsoDate, months: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function startDate(term: { year: number; season: Season }): IsoDate {
  return term.season === "fall" ? iso(term.year, 8, 15) : iso(term.year, 1, 10);
}

export interface AcademicYear {
  index: number;
  semesterDates: [IsoDate, IsoDate];
  /** First of each living month. */
  livingMonths: IsoDate[];
  /** First of each summer month after this academic year (none after the final year's end). */
  summerMonths: IsoDate[];
  isFinal: boolean;
}

/** Lay out each academic year from the start term. */
export function academicYears(
  term: { year: number; season: Season },
  years: DegreeYears,
): AcademicYear[] {
  const start = startDate(term);
  const out: AcademicYear[] = [];
  for (let i = 0; i < years; i++) {
    const yearStart = addMonths(start, 12 * i);
    const livingMonths: IsoDate[] = [];
    for (let m = 0; m < ACADEMIC_MONTHS_PER_YEAR; m++)
      livingMonths.push(firstOfMonth(addMonths(yearStart, m)));
    const summerMonths: IsoDate[] = [];
    for (let m = 0; m < SUMMER_MONTHS_PER_YEAR; m++) {
      summerMonths.push(firstOfMonth(addMonths(yearStart, ACADEMIC_MONTHS_PER_YEAR + m)));
    }
    out.push({
      index: i,
      semesterDates: [yearStart, addMonths(yearStart, ACADEMIC_MONTHS_PER_YEAR / 2)],
      livingMonths,
      summerMonths,
      isFinal: i === years - 1,
    });
  }
  return out;
}

export function firstOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 8)}01`;
}

export function programmeEnd(term: { year: number; season: Season }, years: DegreeYears): IsoDate {
  const last = academicYears(term, years)[years - 1];
  const lastLiving = last?.livingMonths[last.livingMonths.length - 1];
  return lastLiving ? addDays(addMonths(lastLiving, 1), -10) : startDate(term);
}

export function phaseFor(date: IsoDate, start: IsoDate, end: IsoDate): Phase {
  if (date < start) return "pre_arrival";
  if (daysBetween(start, date) <= 31) return "arrival";
  if (date >= end) return "departure";
  return "ongoing";
}
