import { NextResponse } from "next/server";
import { copy } from "@/content/copy";
import type { ApiError, ErrorCode } from "@/lib/schema/api";

export const ERROR_STATUS: Record<ErrorCode, number> = {
  INVALID_INPUT: 400,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  FORBIDDEN_ORIGIN: 403,
  DATA_UNAVAILABLE: 503,
  FEATURE_OFF: 404,
  BOT_CHECK_FAILED: 403,
  UPSTREAM_TIMEOUT: 504,
  INTERNAL: 500,
};

/** An expected failure with a typed code. The message shown to users comes from copy.ts. */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    /** Internal note for logs. Must not contain user input. */
    public readonly note?: string,
  ) {
    super(code);
    this.name = "AppError";
  }
}

/** A data source could not be read; the caller renders that line as an estimate instead. */
export class DataUnavailableError extends AppError {
  constructor(
    public readonly source: string,
    note?: string,
  ) {
    super("DATA_UNAVAILABLE", note);
    this.name = "DataUnavailableError";
  }
}

export class ValidationError extends AppError {
  constructor(note?: string) {
    super("INVALID_INPUT", note);
    this.name = "ValidationError";
  }
}

export function errorResponse(code: ErrorCode, headers?: HeadersInit): NextResponse<ApiError> {
  return NextResponse.json(
    { code, message: copy.errors[code] },
    { status: ERROR_STATUS[code], headers },
  );
}
