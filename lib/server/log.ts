import "server-only";

// Structured JSON logs. Fields are limited to ids, statuses, timings and error codes.
// Never pass user input (URLs, wallets, pasted text, answers) or env values.

export type LogFields = Record<string, string | number | boolean | null | undefined>;
type Level = "debug" | "info" | "warn" | "error";

function write(level: Level, event: string, fields: LogFields): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    process.stdout.write(line + "\n");
  }
}

export const log = {
  debug(event: string, fields: LogFields = {}): void {
    if (process.env.LOG_LEVEL === "debug") write("debug", event, fields);
  },
  info(event: string, fields: LogFields = {}): void {
    write("info", event, fields);
  },
  warn(event: string, fields: LogFields = {}): void {
    write("warn", event, fields);
  },
  error(event: string, fields: LogFields = {}): void {
    write("error", event, fields);
  },
};
