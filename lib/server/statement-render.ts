import { csvDocument } from "@/lib/server/csv";
import { PdfBuilder } from "@/lib/server/pdf";
import { formatStatementMoney, STATEMENT_CURRENCY, type Statement, type StatementRow } from "@/lib/server/statements";

const NAVY: [number, number, number] = [0.06, 0.1, 0.19];
const EMERALD: [number, number, number] = [0.06, 0.65, 0.45];
const MUTED: [number, number, number] = [0.42, 0.47, 0.56];
const TEXT: [number, number, number] = [0.12, 0.16, 0.24];
const RULE: [number, number, number] = [0.87, 0.89, 0.93];
const ZEBRA: [number, number, number] = [0.972, 0.976, 0.984];

const fmtDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : date.toISOString().slice(0, 10);
};
const fmtDateTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)} UTC`;
};
const labelCase = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const truncate = (value: string, length: number) =>
  value.length > length ? `${value.slice(0, Math.max(0, length - 1))}…` : value;

export function statementToCsv(statement: Statement): string {
  const rows: unknown[][] = [
    ["Zentra statement"],
    ["Account holder", statement.user.fullName],
    ["Account number", statement.user.accountNumber],
    ["Period start", fmtDate(statement.period.from)],
    ["Period end", fmtDate(statement.period.to)],
    ["Generated at", fmtDateTime(statement.generatedAt)],
    ["Currency", statement.currency],
    ["Opening balance", formatStatementMoney(statement.openingBalanceCents)],
    ["Total credits", formatStatementMoney(statement.totalCreditsCents)],
    ["Total debits", formatStatementMoney(statement.totalDebitsCents)],
    ["Closing balance", formatStatementMoney(statement.closingBalanceCents)],
    [],
    [
      "Date",
      "Reference",
      "Type",
      "Description",
      "Status",
      "Wallet",
      "Direction",
      "Credit (KES)",
      "Debit (KES)",
      "Fee (KES)",
      "Net (KES)",
      "Running balance (KES)",
    ],
    ...statement.rows.map((row) => [
      fmtDateTime(row.createdAt),
      row.reference,
      labelCase(row.type),
      row.description,
      labelCase(row.status),
      row.wallet,
      row.direction,
      row.creditCents === null ? "" : (row.creditCents / 100).toFixed(2),
      row.debitCents === null ? "" : (row.debitCents / 100).toFixed(2),
      (row.feeCents / 100).toFixed(2),
      (row.netAmountCents / 100).toFixed(2),
      (row.balanceCents / 100).toFixed(2),
    ]),
    [],
    ["Notes"],
    ...statement.notes.map((note) => [note]),
  ];
  return csvDocument(rows);
}

const COLUMNS = {
  date: 40,
  reference: 100,
  description: 192,
  type: 350,
  creditRight: 452,
  debitRight: 500,
  balanceRight: 555,
};

function drawTableHeader(pdf: PdfBuilder, y: number) {
  pdf.fillRect(40, y - 4, 515, 16, NAVY);
  const label = (text: string, x: number, align?: "left" | "right") =>
    pdf.text(text, { x, y, size: 7.5, bold: true, color: [1, 1, 1], align });
  label("DATE", COLUMNS.date);
  label("REFERENCE", COLUMNS.reference);
  label("DESCRIPTION", COLUMNS.description);
  label("TYPE", COLUMNS.type);
  label("CREDIT", COLUMNS.creditRight, "right");
  label("DEBIT", COLUMNS.debitRight, "right");
  label("BALANCE", COLUMNS.balanceRight, "right");
  return y - 16;
}

function drawRow(pdf: PdfBuilder, row: StatementRow, y: number, index: number) {
  if (index % 2 === 1) pdf.fillRect(40, y - 4, 515, 16, ZEBRA);
  pdf.text(fmtDate(row.createdAt), { x: COLUMNS.date, y, size: 7.5, color: TEXT });
  pdf.text(truncate(row.reference, 16), { x: COLUMNS.reference, y, size: 7.5, color: TEXT });
  pdf.text(truncate(row.description, 38), { x: COLUMNS.description, y, size: 7.5, color: TEXT });
  pdf.text(labelCase(row.type), { x: COLUMNS.type, y, size: 7.5, color: MUTED });
  if (row.creditCents !== null) {
    pdf.text(formatStatementMoney(row.creditCents), { x: COLUMNS.creditRight, y, size: 7.5, color: EMERALD, align: "right" });
  }
  if (row.debitCents !== null) {
    pdf.text(formatStatementMoney(row.debitCents), { x: COLUMNS.debitRight, y, size: 7.5, color: TEXT, align: "right" });
  }
  pdf.text(formatStatementMoney(row.balanceCents), { x: COLUMNS.balanceRight, y, size: 7.5, color: TEXT, align: "right" });
  return y - 16;
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line ? `${line} ${word}` : word).length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Build a branded, printable PDF statement from authoritative server data. */
export function statementToPdf(statement: Statement): Buffer {
  const pdf = new PdfBuilder();
  const right = pdf.width - pdf.margin;

  /* Brand header */
  pdf.fillRect(0, pdf.height - 96, pdf.width, 96, NAVY);
  pdf.text("ZENTRA", { x: pdf.margin, y: pdf.height - 48, size: 24, bold: true, color: [1, 1, 1] });
  pdf.text("Build Your Next Level", { x: pdf.margin, y: pdf.height - 66, size: 9, color: [0.68, 0.76, 0.86] });
  pdf.text("ACCOUNT STATEMENT", { x: right, y: pdf.height - 52, size: 13, bold: true, color: [1, 1, 1], align: "right" });
  pdf.text(STATEMENT_CURRENCY, { x: right, y: pdf.height - 69, size: 9, color: [0.68, 0.76, 0.86], align: "right" });

  let y = pdf.height - 128;
  pdf.text(statement.user.fullName, { x: pdf.margin, y, size: 12, bold: true, color: TEXT });
  y -= 15;
  pdf.text(`Account ${statement.user.accountNumber}`, { x: pdf.margin, y, size: 8.5, color: MUTED });
  pdf.text(`Period ${fmtDate(statement.period.from)} to ${fmtDate(statement.period.to)}`, {
    x: right, y, size: 8.5, color: MUTED, align: "right",
  });
  y -= 13;
  pdf.text(statement.user.email, { x: pdf.margin, y, size: 8.5, color: MUTED });
  pdf.text(`Generated ${fmtDateTime(statement.generatedAt)}`, { x: right, y, size: 8.5, color: MUTED, align: "right" });

  /* Summary tiles */
  y -= 30;
  const tileWidth = 123;
  const tiles: Array<{ label: string; value: string; accent?: boolean }> = [
    { label: "OPENING BALANCE", value: formatStatementMoney(statement.openingBalanceCents) },
    { label: "TOTAL CREDITS", value: formatStatementMoney(statement.totalCreditsCents), accent: true },
    { label: "TOTAL DEBITS", value: formatStatementMoney(statement.totalDebitsCents) },
    { label: "CLOSING BALANCE", value: formatStatementMoney(statement.closingBalanceCents) },
  ];
  tiles.forEach((tile, index) => {
    const x = pdf.margin + index * (tileWidth + 7.76);
    pdf.fillRect(x, y - 34, tileWidth, 38, [0.965, 0.972, 0.984]);
    pdf.text(tile.label, { x: x + 8, y: y - 10, size: 6.5, bold: true, color: MUTED });
    pdf.text(tile.value, { x: x + 8, y: y - 25, size: 10, bold: true, color: tile.accent ? EMERALD : NAVY });
  });

  /* Table */
  y -= 58;
  pdf.text("TRANSACTION HISTORY", { x: pdf.margin, y, size: 9, bold: true, color: NAVY });
  y -= 14;
  y = drawTableHeader(pdf, y);

  statement.rows.forEach((row, index) => {
    if (y < 78) {
      pdf.addPage();
      pdf.text("ZENTRA", { x: pdf.margin, y: pdf.height - 44, size: 12, bold: true, color: NAVY });
      pdf.text(`Account statement · ${statement.user.accountNumber}`, {
        x: right, y: pdf.height - 44, size: 8, color: MUTED, align: "right",
      });
      y = pdf.height - 66;
      y = drawTableHeader(pdf, y);
    }
    y = drawRow(pdf, row, y, index);
  });

  if (statement.rows.length === 0) {
    pdf.text("No transactions matched the selected period and filters.", {
      x: pdf.margin, y, size: 8.5, color: MUTED,
    });
    y -= 18;
  }

  /* Totals */
  y -= 4;
  pdf.line(pdf.margin, y, right, y, { width: 0.8, color: RULE });
  y -= 14;
  pdf.text("Closing balance", { x: COLUMNS.description, y, size: 8.5, bold: true, color: TEXT });
  pdf.text(formatStatementMoney(statement.closingBalanceCents), {
    x: COLUMNS.balanceRight, y, size: 9, bold: true, color: NAVY, align: "right",
  });

  /* Notes and assumptions */
  y -= 30;
  if (y < 130) {
    pdf.addPage();
    y = pdf.height - 60;
  }
  pdf.text("STATEMENT NOTES", { x: pdf.margin, y, size: 8.5, bold: true, color: NAVY });
  y -= 14;
  const notes = [...statement.notes, statement.reconciliation.note];
  for (const note of notes) {
    for (const line of wrap(`- ${note}`, 105)) {
      if (y < 60) {
        pdf.addPage();
        y = pdf.height - 60;
      }
      pdf.text(line, { x: pdf.margin, y, size: 7.5, color: MUTED });
      y -= 11;
    }
  }

  y -= 6;
  pdf.text("Estimates: projected investment earnings are not actual earnings and are excluded until credited.", {
    x: pdf.margin, y, size: 7.5, color: MUTED,
  });
  y -= 11;
  pdf.text("This statement is generated from Zentra's transaction records. Keep it confidential.", {
    x: pdf.margin, y, size: 7.5, color: MUTED,
  });

  pdf.stampFooters((index, total) => ({
    left: `Zentra · Statement for ${statement.user.accountNumber}`,
    right: `Page ${index + 1} of ${total}`,
  }));

  return pdf.build();
}
