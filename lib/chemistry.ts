/**
 * Parse a chemical formula string like "C4H10O", "C10H16", "C15H24O2".
 * Returns { c, h, o }. Missing element → 0. Element with no number → 1.
 */
export function parseCF(cf: string): { c: number; h: number; o: number } {
  if (!cf || typeof cf !== "string") return { c: 0, h: 0, o: 0 };
  const clean = cf.replace(/\s+/g, "");

  const extract = (symbol: string): number => {
    const re = new RegExp(`${symbol}(\\d*)(?=[A-Z]|$)`);
    const m = clean.match(re);
    if (!m) return 0;
    if (m[1] === "") return 1;
    return parseInt(m[1], 10);
  };

  return {
    c: extract("C"),
    h: extract("H"),
    o: extract("O"),
  };
}

/**
 * Determine compound type from carbon and oxygen counts.
 * Order matters — first matching rule wins.
 */
export function calculateType(c: number, o: number): string {
  if (c === 10 && o === 0) return "MH";
  if (c === 10 && o > 0) return "OM";
  if (c === 15 && o === 0) return "SH";
  if (c === 15 && o > 0) return "OS";
  if (c === 20 && o === 0) return "DH";
  if (c === 20 && o > 0) return "OD";
  return "OC";
}

/**
 * Calculate molecular mass (Da) from atom counts and atomic constants.
 * Rounded to 2 decimal places.
 */
export function calculateMM(
  c: number,
  h: number,
  o: number,
  constants: { C: number; H: number; O: number },
): number {
  const mm = c * constants.C + h * constants.H + o * constants.O;
  return Math.round(mm * 100) / 100;
}

/**
 * Compare a user-edited numeric field against the value derived from CF.
 * Returns false (mark RED) if mismatched.
 */
export function validateCFField(
  userValue: number,
  cfParsedValue: number,
): boolean {
  if (Number.isNaN(userValue)) return false;
  return userValue === cfParsedValue;
}

/**
 * Compare a numeric field with a tolerance — useful for MM (Da).
 */
export function validateNumericField(
  userValue: number,
  expected: number,
  tolerance = 0.01,
): boolean {
  if (Number.isNaN(userValue) || Number.isNaN(expected)) return false;
  return Math.abs(userValue - expected) <= tolerance;
}

/**
 * Convert an atomic constants list to a keyed object by symbol.
 */
export function constantsToMap(
  rows: { symbol: string; value: number }[],
): { C: number; H: number; O: number } {
  const map = { C: 12.0, H: 1.01, O: 15.99 };
  for (const row of rows) {
    const s = row.symbol.toUpperCase();
    if (s === "C" || s === "H" || s === "O") {
      map[s as "C" | "H" | "O"] = Number(row.value);
    }
  }
  return map;
}
