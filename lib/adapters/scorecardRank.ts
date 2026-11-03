/*
 * Ranking for school search. The Scorecard API answers a name search with every school whose
 * name contains the text, biggest first, so "mit" leads with beauty schools and "texas a"
 * buries Texas A&M. The order a person expects: the name that starts with what they typed,
 * then a word in the name that starts with it, then any match; ties keep the API's size order.
 * Punctuation and spacing are ignored on both sides ("A&M" matches "A & M").
 */
/** What is sent to the API: "&" as "and" (the API does not match the two), single spaces. */
export function searchQuery(q: string): string {
  return q.replace(/&/g, " and ").replace(/\s+/g, " ").trim().toLowerCase();
}

export function normaliseName(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchRank(query: string, name: string): number {
  const q = normaliseName(query);
  const n = normaliseName(name);
  if (!q) return 3;
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.split(" ").some((_, i, words) => words.slice(i).join(" ").startsWith(q))) return 2;
  return 3;
}

/** Stable: within a rank the input order (the API's biggest-first) is kept. */
export function rankSchools<T extends { name: string }>(query: string, rows: T[]): T[] {
  return rows
    .map((row, i) => ({ row, i, rank: matchRank(query, row.name) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.row);
}
