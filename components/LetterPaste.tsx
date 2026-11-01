"use client";

import { useState } from "react";
import { copy } from "@/content/copy";
import { ApiErrorSchema } from "@/lib/schema/api";
import { MAX_LETTER_CHARS, type ExtractedField } from "@/lib/schema/ai";

interface Props {
  botToken: string | undefined;
  onApply: (fields: ExtractedField[]) => void;
}

const field =
  "mt-1 w-full border border-neutral-900 bg-white px-3 py-2 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-900";
const btn =
  "border border-neutral-900 bg-white px-3 py-1 text-sm hover:bg-neutral-100 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-900 disabled:opacity-60";

function describe(f: ExtractedField): string {
  if (f.valueNumber !== null)
    return f.name === "programmeLengthYears"
      ? `${f.valueNumber} ${f.valueNumber === 1 ? "year" : "years"}`
      : `$${f.valueNumber.toLocaleString("en-US")}`;
  return f.valueText ?? "";
}

export function LetterPaste({ botToken, onApply }: Props) {
  const t = copy.ai;
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "reading" | "done" | "applied">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [ticked, setTicked] = useState<Set<ExtractedField["name"]>>(new Set());

  async function read() {
    setStatus("reading");
    setError(null);
    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, ...(botToken ? { botToken } : {}) }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        const parsed = ApiErrorSchema.safeParse(json);
        setError(parsed.success ? parsed.data.message : copy.errors.INTERNAL);
        setStatus("idle");
        return;
      }
      const found = (json as { fields: ExtractedField[] }).fields;
      setFields(found);
      setTicked(new Set(found.filter((f) => f.name !== "estimatedLivingCosts").map((f) => f.name)));
      setStatus("done");
    } catch {
      setError(copy.errors.DATA_UNAVAILABLE);
      setStatus("idle");
    }
  }

  return (
    <section className="mt-6 border border-neutral-300 p-3" aria-labelledby="letter-heading">
      <h2 id="letter-heading" className="font-medium">
        {t.letterHeading}
      </h2>
      <p className="mt-1 text-sm text-neutral-700">{t.letterIntro}</p>
      <label htmlFor="letter" className="mt-2 block">
        {t.letterLabel}
      </label>
      <textarea
        id="letter"
        rows={6}
        maxLength={MAX_LETTER_CHARS}
        className={field}
        placeholder={t.letterPlaceholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-describedby="letter-count"
      />
      <p id="letter-count" className="mt-1 text-right text-xs text-neutral-700">
        {text.length} / {MAX_LETTER_CHARS}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={btn}
          onClick={() => void read()}
          disabled={status === "reading" || text.trim().length < 20}
        >
          {status === "reading" ? t.reading : t.read}
        </button>
        <span className="text-sm text-neutral-700">{t.botNote}</span>
      </p>
      <p className="mt-2 text-sm font-medium" role="alert">
        {error ?? ""}
      </p>

      {status === "done" && fields.length === 0 && <p className="mt-2">{t.nothingFound}</p>}
      {(status === "done" || status === "applied") && fields.length > 0 && (
        <div className="mt-3" aria-live="polite">
          <h4 className="font-medium">{t.foundHeading}</h4>
          <ul className="mt-1 divide-y divide-neutral-300 border-y border-neutral-300">
            {fields.map((f) => (
              <li key={f.name} className="py-2">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={ticked.has(f.name)}
                    disabled={f.name === "estimatedLivingCosts"}
                    onChange={(e) =>
                      setTicked((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(f.name);
                        else next.delete(f.name);
                        return next;
                      })
                    }
                  />
                  <span>
                    <strong>{t.fields[f.name]}:</strong> {describe(f)}
                    <span className="block text-sm text-neutral-700">
                      {t.quoteLabel} <q>{f.quote}</q>
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2">
            <button
              type="button"
              className={btn}
              onClick={() => {
                onApply(fields.filter((f) => ticked.has(f.name)));
                setStatus("applied");
              }}
            >
              {t.use}
            </button>
            {status === "applied" && <span className="ml-2 text-sm">{t.applied}</span>}
          </p>
        </div>
      )}
    </section>
  );
}
