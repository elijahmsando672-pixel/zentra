/**
 * Central staff authorisation matrix. Kept free of framework/DB imports so it
 * can be unit-tested and reused by every server route.
 *
 * `analyst` is the read-only auditor role: it can inspect financial queues but
 * can never move money, approve withdrawals, confirm deposits or edit records.
 * `agent` is limited to customer support.
 * `finance` can operate financial queues but cannot manage staff or settings.
 */

export type StaffRole = "user" | "agent" | "analyst" | "finance" | "admin" | "super_admin";

const ADMINISTRATORS: StaffRole[] = ["super_admin", "admin"];
const FINANCIAL_OPERATORS: StaffRole[] = ["super_admin", "admin", "finance"];
const ANALYSTS: StaffRole[] = ["super_admin", "admin", "finance", "analyst"];
const SUPPORT: StaffRole[] = ["super_admin", "admin", "agent"];

const FINANCIAL_AREAS = new Set(["deposits", "withdrawals", "ledger", "reconciliation", "reports", "audit"]);
const ANALYTICS_AREAS = new Set([
  "dashboard",
  "investments",
  "team-members",
  "team-rewards",
  "referral-activity",
  "campaigns",
  "commission-rules",
]);
const ADMIN_AREAS = new Set(["settings", "announcements", "coupons", "staff", "products"]);

export function canAccess(role: string, area: string, write = false): boolean {
  const staff = role as StaffRole;
  if (!staff || staff === "user") return false;
  if (staff === "super_admin") return true;

  if (area === "tickets") return SUPPORT.includes(staff);
  if (area === "staff") return ADMINISTRATORS.includes(staff);
  if (area === "users") return write ? ADMINISTRATORS.includes(staff) : ANALYSTS.includes(staff);

  if (FINANCIAL_AREAS.has(area)) {
    return write ? FINANCIAL_OPERATORS.includes(staff) : ANALYSTS.includes(staff);
  }
  if (area === "risk") {
    return write ? FINANCIAL_OPERATORS.includes(staff) : ANALYSTS.includes(staff);
  }
  if (ADMIN_AREAS.has(area)) {
    return write ? ADMINISTRATORS.includes(staff) : ADMINISTRATORS.includes(staff);
  }
  if (ANALYTICS_AREAS.has(area)) return ANALYSTS.includes(staff);

  return false;
}

/** Financial decisions always require an operator role, never the analyst role. */
export function canOperateMoney(role: string) {
  return FINANCIAL_OPERATORS.includes(role as StaffRole);
}
