/**
 * CSV helpers for financial exports.
 *
 * - RFC 4180 quoting for commas, quotes and newlines.
 * - Spreadsheet formula-injection mitigation: cells that begin with a
 *   formula trigger (=, +, -, @, tab, carriage return) are prefixed with a
 *   single quote so Excel/Sheets treat them as literal text.
 */

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (FORMULA_TRIGGER.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function csvRows(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function csvDocument(rows: unknown[][]): string {
  return `${csvRows(rows)}\r\n`;
}
