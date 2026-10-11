import assert from "node:assert/strict";
import test from "node:test";
import { formatKES, normalizePhoneKE, parseAmountToNumber, toCSV } from "../lib/utils.ts";
import { parsePositiveMoney } from "../lib/server/money.ts";
import { operationReference, readIdempotencyKey } from "../lib/server/idempotency.ts";

test("formats Kenyan shillings with two decimals by default", () => {
  assert.equal(formatKES(1234.5), "KES 1,234.50");
  assert.equal(formatKES(-25, { sign: true }), "-KES 25.00");
});

test("normalizes Kenyan phone numbers to the international country code", () => {
  assert.equal(normalizePhoneKE("0712 345 678"), "254712345678");
  assert.equal(normalizePhoneKE("+254 712 345 678"), "254712345678");
  assert.equal(normalizePhoneKE("712345678"), "254712345678");
});

test("parses formatted amounts and treats invalid input as zero", () => {
  assert.equal(parseAmountToNumber("KES 12,500.75"), 12500.75);
  assert.equal(parseAmountToNumber("not an amount"), 0);
});

test("escapes CSV cells containing commas, quotes, and newlines", () => {
  assert.equal(toCSV([{ name: 'Zentra, "member"', note: "line 1\nline 2" }]), 'name,note\n"Zentra, ""member""","line 1\nline 2"');
});

test("parses money into exact cents and rejects unsafe amounts", () => {
  assert.deepEqual(parsePositiveMoney(12.34), { cents: 1234, decimal: "12.34", value: 12.34 });
  assert.equal(parsePositiveMoney(0.001), null);
  assert.equal(parsePositiveMoney(Number.POSITIVE_INFINITY), null);
});

test("creates scoped stable references from idempotency keys", () => {
  const key = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(operationReference("TRF", "user-1", key), operationReference("TRF", "user-1", key));
  assert.notEqual(operationReference("TRF", "user-1", key), operationReference("TRF", "user-2", key));
  assert.notEqual(operationReference("TRF", "user-1", key), operationReference("WDR", "user-1", key));
});

test("reads only well-formed idempotency request headers", () => {
  const key = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(readIdempotencyKey(new Request("https://zentra.local", { headers: { "Idempotency-Key": key } })), key);
  assert.equal(readIdempotencyKey(new Request("https://zentra.local", { headers: { "Idempotency-Key": "short" } })), null);
});
