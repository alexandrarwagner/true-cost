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

/** A combobox: type to search, arrows to move, Enter to choose, Escape to close. */
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
  const [activeIndex, setActiveIndex] = useState(-1);
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
          setActiveIndex(-1);
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

  function close() {
    setResults([]);
    setActiveIndex(-1);
    setStatus("idle");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      const pick = results[activeIndex] ?? (results.length === 1 ? results[0] : undefined);
      if (pick) {
        e.preventDefault();
        onChoose(pick);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  if (chosen) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 py-1">
        <span>
          <span className="sr-only">{copy.form.schoolChosen}: </span>
          <strong>{chosen.name}</strong>, {chosen.city}, {chosen.state}
        </span>
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={() => onChoose(null)}
        >
          {copy.form.schoolChange}
        </button>
      </div>
    );
  }

  const open = results.length > 0;
  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        className={field}
        placeholder={copy.form.schoolPlaceholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim().length < 2) close();
        }}
        onKeyDown={onKeyDown}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && activeIndex >= 0 ? `${listId}-${results[activeIndex]?.unitId}` : undefined
        }
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
            className="underline underline-offset-4"
            onClick={() => void smartSearch()}
            disabled={smart === "searching"}
          >
            {smart === "searching" ? copy.ai.smartSearching : copy.ai.smartSearch}
          </button>
          {smart === "none" && (
            <span className="ml-2 text-muted">{smartError ?? copy.ai.smartNone}</span>
          )}
          <span className="ml-2 text-muted">{copy.ai.smartNote}</span>
        </p>
      )}
      <ul
        id={listId}
        role="listbox"
        aria-label={copy.form.school}
        hidden={!open}
        className="absolute top-full left-0 z-10 mt-2 w-full min-w-72 divide-y divide-line rounded-field border border-line bg-card shadow-lg"
      >
        {results.map((s, i) => (
          <li
            key={s.unitId}
            id={`${listId}-${s.unitId}`}
            role="option"
            aria-selected={i === activeIndex}
            className={`cursor-pointer px-3 py-2 ${i === activeIndex ? "bg-page" : "hover:bg-page"}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChoose(s)}
          >
            {s.name}{" "}
            <span className="text-sm text-muted">
              ({s.city}, {s.state})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
