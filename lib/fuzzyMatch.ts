import Fuse from "fuse.js";
import type { Compound } from "@/lib/supabase/types";

const FUSE_OPTIONS = {
  keys: ["compound"],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

/**
 * Normalize a chemical name to handle common variations:
 * - lowercase
 * - replace greek letter spellings with symbols (alpha, beta, gamma, delta)
 * - strip angle-bracket annotations like <1,8->
 * - normalize multiple hyphens / spaces
 */
export function normalizeName(s: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/\balpha\b/g, "α")
    .replace(/\bbeta\b/g, "β")
    .replace(/\bgamma\b/g, "γ")
    .replace(/\bdelta\b/g, "δ")
    .replace(/[\s\-_,]+/g, " ")
    .trim();
}

export function buildFuse(compounds: Compound[]) {
  const enriched = compounds.map((c) => ({
    ...c,
    _normalized: normalizeName(c.compound),
  }));
  return new Fuse(enriched, {
    ...FUSE_OPTIONS,
    keys: ["compound", "_normalized"],
  });
}

export function bestMatch(
  fuse: Fuse<Compound & { _normalized: string }>,
  query: string,
  scoreThreshold = 0.5,
): Compound | null {
  if (!query) return null;
  const direct = fuse.search(query, { limit: 1 });
  if (direct[0] && direct[0].score !== undefined && direct[0].score <= scoreThreshold) {
    return direct[0].item;
  }
  const normalized = normalizeName(query);
  if (normalized && normalized !== query.toLowerCase()) {
    const norm = fuse.search(normalized, { limit: 1 });
    if (norm[0] && norm[0].score !== undefined && norm[0].score <= scoreThreshold) {
      return norm[0].item;
    }
  }
  return null;
}

export function topMatches(
  fuse: Fuse<Compound & { _normalized: string }>,
  query: string,
  limit = 5,
): Compound[] {
  if (!query) return [];
  const seen = new Set<number>();
  const results: Compound[] = [];

  for (const r of fuse.search(query, { limit })) {
    if (!seen.has(r.item.id)) {
      seen.add(r.item.id);
      results.push(r.item);
    }
  }
  if (results.length < limit) {
    const normalized = normalizeName(query);
    if (normalized) {
      for (const r of fuse.search(normalized, { limit })) {
        if (!seen.has(r.item.id)) {
          seen.add(r.item.id);
          results.push(r.item);
          if (results.length >= limit) break;
        }
      }
    }
  }
  return results;
}
