import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true as const, data }, { status });
}

export function fail(
  message: string,
  code?: string,
  fieldErrors?: Record<string, string>,
  status = 400
) {
  return NextResponse.json(
    { ok: false as const, message, code, fieldErrors },
    { status }
  );
}

export function unauthorized() {
  return fail("Please sign in to continue.", "unauthorized", undefined, 401);
}

export function notFound(message = "We could not find that.") {
  return fail(message, "not_found", undefined, 404);
}

export class InvalidJsonError extends Error {
  constructor() {
    super("The request body must be valid JSON.");
    this.name = "InvalidJsonError";
  }
}

// Reads a required JSON body. A malformed body is a client error, so it is
// surfaced as a 400 instead of bubbling up to serverError as a 500.
export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new InvalidJsonError();
  }
}

export function serverError(error: unknown) {
  if (error instanceof InvalidJsonError) {
    return fail(error.message, "invalid_json", undefined, 400);
  }
  console.error("[api]", error);
  return fail("Something went wrong. Please try again.", "server_error", undefined, 500);
}
