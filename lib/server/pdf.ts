/**
 * Minimal, dependency-free PDF 1.4 writer for text statements.
 *
 * Uses the built-in Helvetica core fonts and emits a standards-compliant
 * cross-reference table. This avoids pulling an external PDF library into the
 * financial export path while still producing printable, selectable documents.
 */

export type Rgb = [number, number, number];

type TextOptions = {
  x: number;
  y: number;
  size?: number;
  bold?: boolean;
  color?: Rgb;
  align?: "left" | "right" | "center";
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const TRANSLITERATE: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2026": "...",
  "\u2022": "-",
  "\u2192": "->",
  "\u00b7": "-",
  "\u20ac": "EUR",
  "\u00a3": "GBP",
};

export function sanitizePdfText(input: string): string {
  let out = "";
  for (const char of input.normalize("NFKD")) {
    const replacement = TRANSLITERATE[char];
    if (replacement !== undefined) {
      out += replacement;
      continue;
    }
    const code = char.codePointAt(0) ?? 0;
    if (char === "\n" || char === "\r" || char === "\t") out += " ";
    else if (code >= 32 && code <= 255) out += char;
    else if (code > 255) out += "?";
  }
  return out.replace(/\s+/g, " ").trim();
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

const CHAR_WIDTHS: Record<string, number> = {
  " ": 278, ".": 278, ",": 278, "-": 333, ":": 278, "/": 278, "(": 333, ")": 333,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556,
  "8": 556, "9": 556, "%": 889, "+": 584, "#": 556, "&": 667, "@": 1015, "_": 556,
};

export function measurePdfText(text: string, size: number, bold = false): number {
  const factor = bold ? 1.04 : 1;
  let width = 0;
  for (const char of text) {
    const upper = char.toUpperCase();
    const isUpper = char === upper && char !== char.toLowerCase();
    width += CHAR_WIDTHS[char] ?? (isUpper ? 667 : 500);
  }
  return (width / 1000) * size * factor;
}

const fmt = (value: number) => Number(value.toFixed(3)).toString();

export class PdfBuilder {
  readonly width = PAGE_WIDTH;
  readonly height = PAGE_HEIGHT;
  readonly margin = 40;
  private pages: string[][] = [[]];
  private page = 0;

  get cursorTop() {
    return this.height - this.margin;
  }

  get cursorBottom() {
    return this.margin;
  }

  addPage() {
    this.pages.push([]);
    this.page = this.pages.length - 1;
  }

  get pageCount() {
    return this.pages.length;
  }

  private ops() {
    return this.pages[this.page];
  }

  text(content: string, options: TextOptions) {
    const size = options.size ?? 9;
    const text = sanitizePdfText(content);
    if (!text) return;
    const [r, g, b] = options.color ?? [0.08, 0.11, 0.2];
    let x = options.x;
    if (options.align === "right") x -= measurePdfText(text, size, options.bold);
    if (options.align === "center") x -= measurePdfText(text, size, options.bold) / 2;
    this.ops().push(
      `BT /${options.bold ? "F2" : "F1"} ${fmt(size)} Tf ${fmt(r)} ${fmt(g)} ${fmt(b)} rg 1 0 0 1 ${fmt(x)} ${fmt(options.y)} Tm (${escapePdfText(text)}) Tj ET`
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, options?: { width?: number; color?: Rgb }) {
    const [r, g, b] = options?.color ?? [0.82, 0.85, 0.9];
    this.ops().push(
      `${fmt(r)} ${fmt(g)} ${fmt(b)} RG ${fmt(options?.width ?? 0.6)} w ${fmt(x1)} ${fmt(y1)} m ${fmt(x2)} ${fmt(y2)} l S`
    );
  }

  fillRect(x: number, y: number, width: number, height: number, color: Rgb) {
    const [r, g, b] = color;
    this.ops().push(`${fmt(r)} ${fmt(g)} ${fmt(b)} rg ${fmt(x)} ${fmt(y)} ${fmt(width)} ${fmt(height)} re f`);
  }

  /** Add a footer to every page once all content has been laid out. */
  stampFooters(draw: (pageIndex: number, pageCount: number) => { left: string; right?: string }) {
    const total = this.pages.length;
    const previous = this.page;
    for (let index = 0; index < total; index++) {
      this.page = index;
      const content = draw(index, total);
      const color: Rgb = [0.45, 0.5, 0.58];
      this.text(content.left, { x: this.margin, y: 26, size: 7.5, color });
      if (content.right) {
        this.text(content.right, { x: this.width - this.margin, y: 26, size: 7.5, color, align: "right" });
      }
    }
    this.page = previous;
  }

  build(): Buffer {
    const pageCount = this.pages.length;
    const firstPageObject = 3;
    const fontRegular = firstPageObject + pageCount * 2;
    const fontBold = fontRegular + 1;
    const objects: string[] = new Array(fontRegular + 2).fill("");

    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    const kids = Array.from({ length: pageCount }, (_, i) => `${firstPageObject + i * 2} 0 R`).join(" ");
    objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;

    for (let i = 0; i < pageCount; i++) {
      const pageObj = firstPageObject + i * 2;
      const contentObj = pageObj + 1;
      const stream = this.pages[i].join("\n");
      objects[pageObj] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] ` +
        `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> ` +
        `/Contents ${contentObj} 0 R >>`;
      objects[contentObj] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
    }

    objects[fontRegular] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[fontBold] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

    const header = Buffer.from("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n", "latin1");
    const chunks: Buffer[] = [header];
    let offset = header.length;
    const offsets: number[] = [];

    for (let i = 1; i < objects.length; i++) {
      const body = Buffer.from(`${i} 0 obj\n${objects[i]}\nendobj\n`, "latin1");
      offsets[i] = offset;
      chunks.push(body);
      offset += body.length;
    }

    const xrefStart = offset;
    let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i++) {
      xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
    chunks.push(Buffer.from(xref, "latin1"));

    return Buffer.concat(chunks);
  }
}
