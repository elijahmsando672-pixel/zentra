const STORAGE_PREFIX = "zentra:idempotency:";

export function getIdempotencyKey(operation: "deposit" | "transfer" | "withdrawal" | "investment") {
  const storageKey = `${STORAGE_PREFIX}${operation}`;
  const key = crypto.randomUUID();
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return existing;
    window.sessionStorage.setItem(storageKey, key);
  } catch {
    return key;
  }
  return key;
}

export function clearIdempotencyKey(operation: "deposit" | "transfer" | "withdrawal" | "investment") {
  try {
    window.sessionStorage.removeItem(`${STORAGE_PREFIX}${operation}`);
  } catch {
    // Storage may be disabled; the current request still has its generated key.
  }
}
