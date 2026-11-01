"use client";

import { useEffect, useId, useRef, useState } from "react";
import { copy } from "@/content/copy";
import type { SchoolSummary } from "@/lib/adapters/types";
import { ApiErrorSchema } from "@/lib/schema/api";

interface Props {
  /** Input id, matched by the caller's label. */
  id?: string;
  chosen: SchoolSummary | null;
  onChoose: (school: SchoolSummary | null) => void;
  aiEnabled?: boolean;
  botToken?: string;
}

const field =
  "w-full rounded-field bg-transparent py-1 placeholder:text-muted focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-brand";

export function SchoolSearch({
  id = "school",
  chosen,
  onChoose,
  aiEnabled = false,
  botToken,
}: Props) {
  const [smart, setSmart] = useState<"idle" | "searching" | "none">("idle");
  const [smartError, setSmartError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SchoolSummary[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "done">("idle");
  const listId = useId();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const t = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setStatus("searching");
      fetch(`/api/schools/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((json: { results?: SchoolSummary[] }) => {
          setResults(json.results ?? []);
          setStatus("done");
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setStatus("done");
        });
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  async function smartSearch() {
    setSmart("searching");
    setSmartError(null);
    try {
      const res = await fetch("/api/ai/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: query.trim(), ...(botToken ? { botToken } : {}) }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const err = ApiErrorSchema.safeParse(json);
        setSmartError(err.success ? err.data.message : copy.errors.INTERNAL);
        setSmart("none");
        return;
      }
      const results = (json as { results?: SchoolSummary[] }).results;
      if (results && results.length > 0) {
        setResults(results);
        setStatus("done");
        setSmart("idle");
      } else setSmart("none");
    } catch {
      setSmart("none");
    }
  }

  if (chosen) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 py-1">
        <span>
          <span className="sr-only">{copy.form.schoolChosen}: </span>
          <strong>{chosen.name}</strong>, {chosen.city}, {chosen.state}
        </span>
        <button type="button" className="underline" onClick={() => onChoose(null)}>
          {copy.form.schoolChange}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        autoComplete="off"
        className={field}
        placeholder={copy.form.schoolPlaceholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim().length < 2) {
            setResults([]);
            setStatus("idle");
          }
        }}
        aria-controls={results.length > 0 ? listId : undefined}
        aria-describedby={`${listId}-status`}
      />
      <p id={`${listId}-status`} className="sr-only" aria-live="polite">
        {status === "searching"
          ? copy.form.schoolSearching
          : status === "done"
            ? results.length
              ? copy.form.schoolResults(results.length)
              : copy.form.schoolNoResults
            : ""}
      </p>
      {aiEnabled && status === "done" && results.length === 0 && (
        <p className="mt-1 text-sm">
          <button
            type="button"
            className="underline"
            onClick={() => void smartSearch()}
            disabled={smart === "searching"}
          >
            {smart === "searching" ? copy.ai.smartSearching : copy.ai.smartSearch}
          </button>
          {smart === "none" && (
            <span className="ml-2 text-neutral-700">{smartError ?? copy.ai.smartNone}</span>
          )}
          <span className="ml-2 text-neutral-700">{copy.ai.smartNote}</span>
        </p>
      )}
      {results.length > 0 && (
        <ul
          id={listId}
          className="absolute top-full left-0 z-10 mt-2 w-full min-w-72 divide-y divide-line rounded-field border border-line bg-card shadow-lg"
        >
          {results.map((s) => (
            <li key={s.unitId}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-page focus:bg-page focus:outline-none"
                onClick={() => onChoose(s)}
              >
                {s.name}{" "}
                <span className="text-sm text-neutral-700">
                  ({s.city}, {s.state})
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
