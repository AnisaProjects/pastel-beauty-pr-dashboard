// AD (Gregorian) -> BS (Bikram Sambat) conversion helpers.
//
// The actual calendar tables live in @remotemerge/nepali-date-converter (BS
// month lengths can't be computed with a formula — they're published per
// year). This file only adds what the app needs on top of it:
//   - strict input validation (the library silently rolls "2026-02-30" over
//     to March, which would give a wrong BS date instead of an error)
//   - a stable "YYYY-MM-DD" output that matches how bsDate is stored
//   - a human label like "Ashwin 5, 2083" for the UI
//
// Pure functions, no browser/Node-only APIs — safe to import from both the
// client (RecordModal) and the server (validate.ts).

import DateConverter from "@remotemerge/nepali-date-converter";

export const BS_MONTHS = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
] as const;

// Range the converter supports: 1975-01-01 BS .. 2099-12-30 BS. Used for the
// <input type="date"> min/max so the picker can't offer unconvertible dates.
export const AD_MIN = "1918-04-13";
export const AD_MAX = "2043-04-13";

export type BsDate = {
  year: number;
  month: number; // 1-12
  day: number;
  iso: string; // "2083-06-05" — the format stored in pr_records.bs_date
  monthName: string;
  label: string; // "Ashwin 5, 2083"
};

const AD_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const BS_ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

const pad2 = (n: number) => String(n).padStart(2, "0");

function makeBs(year: number, month: number, day: number): BsDate {
  const monthName = BS_MONTHS[month - 1];
  return {
    year,
    month,
    day,
    iso: `${year}-${pad2(month)}-${pad2(day)}`,
    monthName,
    label: `${monthName} ${day}, ${year}`,
  };
}

/**
 * Convert an English date ("yyyy-mm-dd", or a full ISO datetime — only the
 * date part is used) to its Nepali date. Returns null for blank, malformed,
 * non-existent (e.g. Feb 30) or out-of-range dates.
 */
export function adToBs(adDate: string | null | undefined): BsDate | null {
  if (!adDate) return null;
  const m = AD_ISO.exec(adDate.trim().slice(0, 10));
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  // Reject dates that don't exist on the calendar (JS would roll them over).
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    return null;
  }

  try {
    const bs = new DateConverter(`${m[1]}-${m[2]}-${m[3]}`).toBs();
    if (!bs.year || bs.month < 1 || bs.month > 12 || !bs.date) return null;
    return makeBs(bs.year, bs.month, bs.date);
  } catch {
    // library throws when the date is outside its supported range
    return null;
  }
}

/**
 * Turn a stored BS string ("2083-06-05") into a label ("Ashwin 5, 2083").
 * Returns null for legacy free-text values that aren't in numeric Y-M-D form.
 */
export function bsLabel(bsDate: string | null | undefined): string | null {
  if (!bsDate) return null;
  const m = BS_ISO.exec(bsDate.trim());
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 32) return null;
  return makeBs(Number(m[1]), month, day).label;
}
