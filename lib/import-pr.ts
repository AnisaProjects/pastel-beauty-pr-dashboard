import { unzipSync } from "fflate";
import type { PrRecordInput } from "@/lib/types";

type CellRow = string[];
type WorkbookSheet = { name: string; rows: CellRow[]; formulaCells: Set<string> };
type ProductLine = { category: string; shade: string; quantity: number };
type ImportedRow = Record<string, unknown>;

function cleanHeader(value: string): string {
  if (value.includes("::")) return value.trim();
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseCsv(text: string): CellRow[] {
  const rows: CellRow[] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? "A";
  return [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
}

function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, entity: string) => {
    if (entity === "amp") return "&";
    if (entity === "lt") return "<";
    if (entity === "gt") return ">";
    if (entity === "quot") return '"';
    if (entity === "apos") return "'";
    const codepoint = entity.startsWith("#x") ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
    return Number.isFinite(codepoint) ? String.fromCodePoint(codepoint) : match;
  });
}

function xmlElements(xml: string, name: string): { attributes: string; content: string }[] {
  const tag = `(?:[A-Za-z_][\\w.-]*:)?${name}`;
  const matcher = new RegExp(`<${tag}\\b([^>]*?)(?:\\/\\s*>|>([\\s\\S]*?)<\\/${tag}\\s*>)`, "g");
  return [...xml.matchAll(matcher)].map((match) => ({ attributes: match[1] ?? "", content: match[2] ?? "" }));
}

function xmlAttribute(attributes: string, name: string): string | null {
  const matcher = new RegExp(`(?:^|\\s)(?:[A-Za-z_][\\w.-]*:)?${name}\\s*=\\s*(["'])(.*?)\\1`);
  const value = attributes.match(matcher)?.[2];
  return value === undefined ? null : decodeXml(value);
}

function xmlTextContents(xml: string): string[] {
  return xmlElements(xml, "t").map((item) => decodeXml(item.content));
}

function parseXlsxSheets(buffer: ArrayBuffer): WorkbookSheet[] {
  const files = unzipSync(new Uint8Array(buffer));
  const decoder = new TextDecoder();
  const xml = (path: string) => {
    const bytes = files[path];
    if (!bytes) return null;
    return decoder.decode(bytes);
  };
  const sharedDoc = xml("xl/sharedStrings.xml");
  const shared = sharedDoc ? xmlElements(sharedDoc, "si").map((si) => xmlTextContents(si.content).join("")) : [];
  const workbook = xml("xl/workbook.xml");
  const relDoc = xml("xl/_rels/workbook.xml.rels");
  if (!workbook || !relDoc) throw new Error("The Excel workbook structure is incomplete.");
  const relations = new Map(
    xmlElements(relDoc, "Relationship").map((item) => [xmlAttribute(item.attributes, "Id") ?? "", xmlAttribute(item.attributes, "Target") ?? ""]),
  );
  const sheets: WorkbookSheet[] = [];
  for (const sheetNode of xmlElements(workbook, "sheet")) {
    const name = xmlAttribute(sheetNode.attributes, "name") ?? "Sheet";
    const relationId = xmlAttribute(sheetNode.attributes, "id");
    const target = relationId ? relations.get(relationId) : null;
    if (!target) continue;
    const cleanTarget = target.replace(/^\//, "").replace(/^xl\//, "");
    const sheetPath = `xl/${cleanTarget}`;
    const sheetDoc = xml(sheetPath);
    if (!sheetDoc) continue;
    const rows: CellRow[] = [];
    const formulaCells = new Set<string>();
    for (const rowNode of xmlElements(sheetDoc, "row")) {
      const rowNumber = Math.max(0, Number(xmlAttribute(rowNode.attributes, "r") ?? rows.length + 1) - 1);
      const row: CellRow = rows[rowNumber] ?? [];
      for (const cellNode of xmlElements(rowNode.content, "c")) {
        const ref = xmlAttribute(cellNode.attributes, "r") ?? "A1";
        const index = columnIndex(ref);
        const type = xmlAttribute(cellNode.attributes, "t");
        const value = xmlElements(cellNode.content, "v")[0]?.content ?? "";
        const inlineText = xmlTextContents(cellNode.content).join("");
        row[index] = type === "s" ? shared[Number(value)] ?? "" : type === "inlineStr" ? inlineText : value;
        if (xmlElements(cellNode.content, "f").length > 0) formulaCells.add(`${rowNumber}:${index}`);
      }
      rows[rowNumber] = row;
    }
    sheets.push({ name, rows: rows.map((row) => row ?? []), formulaCells });
  }
  if (sheets.length === 0) throw new Error("The Excel workbook has no readable worksheets.");
  return sheets;
}

function cell(row: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    const value = row[cleanHeader(alias)];
    if (value !== undefined && value.trim()) return value.trim();
  }
  return "";
}

function dateValue(value: string): string {
  if (!value) return "";
  const serial = Number(value);
  if (/^\d+(\.\d+)?$/.test(value) && serial > 20000 && serial < 100000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
    return date.toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.slice(0, 10) : parsed.toISOString().slice(0, 10);
}

function textValue(value: string | undefined): string | null {
  const text = (value ?? "").trim();
  return text || null;
}

function canonicalCategory(category: string): string {
  const normalized = category.trim();
  return normalized === "Kajol/ Brush set" || normalized === "Kajol/Brush set" ? "Kajal/Brush set" : normalized;
}

function legacyProducts(value: unknown): ProductLine[] {
  if (typeof value === "string") {
    try { value = JSON.parse(value) as unknown; }
    catch { throw new Error("Product quantities must be a JSON object or list."); }
  }
  if (Array.isArray(value)) return value.map((p) => p as ProductLine);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).map(([key, qty]) => {
    const sep = key.indexOf("::");
    if (sep < 0) throw new Error(`Product column “${key}” must use Category::Product format.`);
    return { category: key.slice(0, sep), shade: key.slice(sep + 2), quantity: Number(qty) };
  });
}

function normalizeRecords(input: unknown[]): PrRecordInput[] {
  return input.map((value, index) => {
    if (!value || typeof value !== "object") throw new Error(`Record ${index + 1} is not an object.`);
    const rec = value as ImportedRow;
    return {
      fy: String(rec.fy ?? rec.fiscalYear ?? rec["Fiscal Year"] ?? "").trim(),
      date: dateValue(String(rec.date ?? rec.sentDate ?? rec["Date Sent"] ?? "")),
      bsDate: rec.bsDate == null ? null : String(rec.bsDate),
      name: rec.name == null ? null : String(rec.name),
      address: rec.address == null ? null : String(rec.address),
      phone: rec.phone == null ? null : String(rec.phone),
      isTest: rec.isTest === true || String(rec.isTest).toLowerCase() === "true" || String(rec.isTest) === "1",
      notes: rec.notes == null ? null : String(rec.notes),
      products: legacyProducts(rec.products),
    };
  });
}

function parseTable(rows: CellRow[]): PrRecordInput[] {
  if (rows.length < 2) throw new Error("The file needs a header row and at least one data row.");
  const headers = rows[0].map(cleanHeader);
  const data = rows.slice(1).map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""])));
  const first = data[0];
  if (first && ("products" in first || "product quantities" in first)) {
    return normalizeRecords(data.map((row) => ({ ...row, products: row.products || row["product quantities"] })));
  }

  const categoryHeader = ["category", "product category", "product type"].find((key) => headers.includes(key));
  const shadeHeader = ["shade", "product", "product name", "product shade", "item"].find((key) => headers.includes(key));
  const quantityHeader = ["quantity", "qty", "units", "product quantity"].find((key) => headers.includes(key));
  const longFormat = !!(categoryHeader && shadeHeader && quantityHeader);
  const groups = new Map<string, PrRecordInput>();
  const productColumns = headers.filter((header) => header.includes("::"));

  data.forEach((row, rowIndex) => {
    const explicitId = cell(row, ["record id", "pr id", "send id", "id"]);
    const identity = explicitId || [
      cell(row, ["fy", "fiscal year"]), cell(row, ["date", "date sent", "sent date"]),
      cell(row, ["name", "recipient", "recipient name", "influencer"]),
      cell(row, ["address"]), cell(row, ["phone"]), cell(row, ["notes"]),
    ].join("\u001f") || `row-${rowIndex}`;
    let record = groups.get(identity);
    if (!record) {
      record = {
        fy: cell(row, ["fy", "fiscal year"]), date: dateValue(cell(row, ["date", "date sent", "sent date"])),
        bsDate: cell(row, ["bs date", "nepali date"]) || null,
        name: cell(row, ["name", "recipient", "recipient name", "influencer"]) || null,
        address: cell(row, ["address"]) || null, phone: cell(row, ["phone", "contact"]) || null,
        isTest: ["true", "yes", "1"].includes(cell(row, ["is test", "test"]).toLowerCase()),
        notes: cell(row, ["notes", "note"]) || null, products: [],
      };
      groups.set(identity, record);
    }
    if (longFormat) {
      const category = row[categoryHeader!] ?? "", shade = row[shadeHeader!] ?? "";
      const quantity = Number(row[quantityHeader!]);
      if (category && shade && quantity > 0) {
        if (!Number.isSafeInteger(quantity)) throw new Error(`Row ${rowIndex + 2}: product quantity must be a whole number.`);
        record.products.push({ category: canonicalCategory(category), shade: shade.trim(), quantity });
      }
    } else {
      for (const key of productColumns) {
        const quantity = Number(row[key]);
        if (Number.isFinite(quantity) && quantity > 0) {
          if (!Number.isSafeInteger(quantity)) throw new Error(`Row ${rowIndex + 2}: product quantity must be a whole number.`);
          const [category, ...shadeParts] = key.split("::");
          record.products.push({ category: canonicalCategory(category), shade: shadeParts.join("::").trim(), quantity });
        }
      }
    }
  });
  const records = [...groups.values()];
  if (!longFormat && productColumns.length === 0) {
    throw new Error("This spreadsheet has no product-level quantities. Include Category, Product/Shade, Quantity columns or Category::Shade quantity columns.");
  }
  if (records.some((record) => record.products.length === 0)) {
    throw new Error("At least one PR row has no product quantities. Combined UNITS totals cannot replace individual product quantities.");
  }
  return records;
}

function parseFiscalYearSheet(sheet: WorkbookSheet, fiscalYear: string): PrRecordInput[] {
  const { rows, formulaCells } = sheet;
  if (rows.length < 3) return [];
  const groupHeaders = rows[0] ?? [];
  const productHeaders = rows[1] ?? [];
  const records: PrRecordInput[] = [];
  for (let rowIndex = 2; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row?.[0]?.trim()) continue;
    const products: ProductLine[] = [];
    let category = "";
    for (let col = 7; col < productHeaders.length; col++) {
      if (groupHeaders[col]?.trim()) category = canonicalCategory(groupHeaders[col]);
      const shade = productHeaders[col]?.trim();
      if (!category || !shade || formulaCells.has(`${rowIndex}:${col}`)) continue;
      const quantity = Number(row[col]);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      if (!Number.isSafeInteger(quantity)) throw new Error(`${sheet.name}, row ${rowIndex + 1}: product quantity must be a whole number.`);
      products.push({ category, shade, quantity });
    }
    const date = dateValue(row[0]);
    if (!date) continue;
    records.push({
      fy: fiscalYear,
      date,
      bsDate: row[1] ? dateValue(row[1]) || row[1] : null,
      name: textValue(row[2]),
      address: textValue(row[3]),
      phone: textValue(row[4]),
      isTest: ["yes", "true", "1"].includes((row[5] ?? "").trim().toLowerCase()),
      notes: textValue(row[6]),
      products,
    });
  }
  return records;
}

export async function parsePrImport(file: File): Promise<PrRecordInput[]> {
  const extension = file.name.toLowerCase().split(".").pop();
  if (extension === "json") {
    const parsed: unknown = JSON.parse(await file.text());
    const rows = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" && Array.isArray((parsed as { records?: unknown }).records) ? (parsed as { records: unknown[] }).records : null;
    if (!rows) throw new Error("JSON must contain an array of PR records.");
    return normalizeRecords(rows);
  }
  if (extension === "csv") return parseTable(parseCsv(await file.text()));
  if (extension === "xlsx") {
    const sheets = parseXlsxSheets(await file.arrayBuffer());
    const fiscalSheets = sheets.flatMap((sheet) => {
      const match = sheet.name.match(/\b(\d{4}-\d{2})\b/);
      return match ? [{ sheet, fiscalYear: match[1] }] : [];
    });
    if (fiscalSheets.length) {
      // Multi-year PR workbooks often include historical fiscal tabs. Import
      // only the latest one to avoid silently duplicating older fiscal years.
      fiscalSheets.sort((a, b) => b.fiscalYear.localeCompare(a.fiscalYear));
      return parseFiscalYearSheet(fiscalSheets[0].sheet, fiscalSheets[0].fiscalYear);
    }
    return parseTable(sheets[0].rows);
  }
  throw new Error("Choose a JSON, CSV, or Excel (.xlsx) file.");
}
