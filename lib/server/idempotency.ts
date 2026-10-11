import { createHash } from "node:crypto";

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;

export function readIdempotencyKey(request: Request) {
  const value = request.headers.get("idempotency-key")?.trim();
  return value && IDEMPOTENCY_KEY_PATTERN.test(value) ? value : null;
}

export function operationReference(prefix: string, userId: string, key: string) {
  const digest = createHash("sha256")
    .update(`${prefix}\0${userId}\0${key}`)
    .digest("hex")
    .slice(0, 32)
    .toUpperCase();
  return `${prefix}-${digest}`;
}

export function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
