/**
 * Gender-aware filtering for ShopSense search results.
 *
 * Per Claude's recommendation (2026-10-03): do NOT infer gender from a person's
 * face/body. Use signals in priority order:
 *   1. Explicit user control (Men / Women / Unisex / Any chip) — source of truth
 *   2. Query text (incl. Roman Urdu: ladies, zanana, mardana, gents, bachon)
 *   3. Item phrase gender ("men running sneakers" vs "women sneakers")
 *   4. Listing gender from title tokens / category
 *
 * Hard-exclude listings confidently carrying the opposite gender label,
 * down-rank unknown ones, always pass unisex.
 *
 * Behind the GENDER_FILTER_ENABLED flag (localStorage, default OFF).
 */

export type GenderLabel = 'men' | 'women' | 'unisex' | 'unknown';
export type GenderPreference = 'men' | 'women' | 'unisex' | 'any';

const MEN_TOKENS = /\b(men'?s?|gents?|male|boys?|mardana|mard)\b/i;
const WOMEN_TOKENS = /\b(women'?s?|ladies|lady|female|girls?|zanana|aurat)\b/i;
const UNISEX_TOKENS = /\b(unisex|couple|family)\b/i;
const KIDS_TOKENS = /\b(kids?|children|bachon|bacha|baby)\b/i;

/** Detect the gender a listing is marketed for, from its title. */export function detectListingGender(title: string): GenderLabel {
  if (!title) return 'unknown';
  if (UNISEX_TOKENS.test(title)) return 'unisex';
  // Kids items pass through for any preference (not opposite-gendered)
  if (KIDS_TOKENS.test(title)) return 'unisex';
  const isMen = MEN_TOKENS.test(title);
  const isWomen = WOMEN_TOKENS.test(title);
  if (isMen && !isWomen) return 'men';
  if (isWomen && !isMen) return 'women';
  return 'unknown';
}

/** Detect gender intent from a search query (incl. Roman Urdu terms). */
export function detectQueryGender(query: string): GenderPreference | null {
  if (!query) return null;
  const q = query.toLowerCase();
  const isMen = MEN_TOKENS.test(q);
  const isWomen = WOMEN_TOKENS.test(q);
  if (UNISEX_TOKENS.test(q)) return 'unisex';
  if (isMen && !isWomen) return 'men';
  if (isWomen && !isMen) return 'women';
  return null;
}

/** Detect gender from a marketplace phrase (e.g. "men running sneakers"). */
export function detectPhraseGender(phrase: string | null): GenderPreference | null {
  if (!phrase) return null;
  const p = phrase.toLowerCase();
  if (/\bmen\b/.test(p)) return 'men';
  if (/\bwomen\b/.test(p)) return 'women';
  return null;
}

/**
 * Query biasing per Claude 2026-10-03: when gender is known, rewrite the
 * marketplace query to use gendered vocabulary. In Pakistan "kurta" is
 * strongly male-coded; women's items are listed as "kurti", "kameez",
 * "stitched suit", or "2pc/3pc".
 *
 * Returns the rewritten query, or null if no rewrite applies.
 */
export function biasQueryForGender(
  query: string,
  preference: GenderPreference,
): string | null {
  if (preference !== 'women' && preference !== 'men') return null;
  const q = query.toLowerCase();

  // Kurta family: the reported bug — women's photo → men's "kurta pajama"
  if (/\bkurta\b/.test(q)) {
    if (preference === 'women') {
      // Map to women's vocabulary, preserving descriptive words
      const rest = q
        .replace(/\bkurta\b/g, 'kurti')
        .replace(/\bpajama\b/g, '')
        .replace(/\bshalwar\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      return `women ${rest}`.replace(/\bwomen women\b/, 'women');
    }
    // Men: ensure "men" is present for male-coded queries
    if (!/\bmen\b/.test(q)) {
      return `men ${q}`;
    }
  }

  return null;
}

export interface GenderFilterResult<T> {
  kept: T[];
  removed: number;
  removedTitles: string[];
  /** True when the safety valve relaxed filtering (too few candidates). */
  relaxed?: boolean;
}

/**
 * Filter listings by gender preference — TIERED per Claude 2026-10-03.
 *
 * - strength 'hard' (explicit user chip or query word): hard-exclude confident
 *   opposite-gender listings. This is the "never suggest male items to women" guarantee.
 * - strength 'soft' (inferred from phrase/CLIP): strong penalty, NOT exclusion.
 *   Opposite-gender items are kept but ranked last — one misclassification
 *   can't empty the page.
 * - Safety valve: if hard filtering leaves <8 candidates, relax to soft and log it.
 * - 'unisex' listings always pass; 'unknown' down-ranked below confident matches.
 */
export function filterByGender<T extends { title: string }>(
  listings: T[],
  preference: GenderPreference,
  strength: 'hard' | 'soft' = 'hard',
): GenderFilterResult<T> {
  if (preference === 'any') {
    return { kept: listings, removed: 0, removedTitles: [] };
  }

  const opposite = preference === 'men' ? 'women' : preference === 'women' ? 'men' : null;
  const kept: T[] = [];
  const unknowns: T[] = [];
  const penalized: T[] = []; // soft: opposite-gender kept but ranked last
  const removedTitles: string[] = [];

  for (const l of listings) {
    const g = detectListingGender(l.title);
    if (g === 'unisex') {
      kept.push(l);
    } else if (opposite && g === opposite) {
      if (strength === 'hard') {
        removedTitles.push(l.title);
      } else {
        penalized.push(l); // soft: keep but rank last
      }
    } else if (g === preference) {
      kept.push(l);
    } else if (g === 'unknown') {
      unknowns.push(l);
    } else if (preference === 'unisex') {
      removedTitles.push(l.title);
    } else {
      kept.push(l);
    }
  }

  let finalKept = [...kept, ...unknowns, ...penalized];
  let relaxed = false;

  // Safety valve: if hard filtering leaves too few, relax to soft
  if (strength === 'hard' && finalKept.length < 8 && removedTitles.length > 0) {
    relaxed = true;
    // Re-run as soft to restore penalized items
    const soft = filterByGender(listings, preference, 'soft');
    return { ...soft, relaxed: true };
  }

  return { kept: finalKept, removed: removedTitles.length, removedTitles, relaxed };
}

/** Gender filter flag: default ON (user request 2026-10-03 — women's searches
 *  must not return men's products). Set 'shopsense-gender-filter' to '0' to
 *  disable explicitly. Tiered per Claude 2026-10-03: hard for explicit, soft
 *  for inferred. */
export function isGenderFilterEnabled(): boolean {
  try {
    return localStorage.getItem('shopsense-gender-filter') !== '0';
  } catch {
    return true;
  }
}

export function setGenderFilterEnabled(on: boolean): void {
  try {
    localStorage.setItem('shopsense-gender-filter', on ? '1' : '0');
  } catch {
    /* ignore */
  }
}
