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

export function serverError(error: unknown) {
  console.error("[api]", error);
  return fail("Something went wrong. Please try again.", "server_error", undefined, 500);
}
