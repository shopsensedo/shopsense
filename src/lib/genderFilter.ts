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

/** Detect the gender a listing is marketed for, from its title. */
export function detectListingGender(title: string): GenderLabel {
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

export interface GenderFilterResult<T> {
  kept: T[];
  removed: number;
  removedTitles: string[];
}

/**
 * Filter listings by gender preference.
 * - 'any': no filtering
 * - 'men'/'women': hard-exclude confident opposite-gender, down-rank unknown
 * - 'unisex': prefer unisex/unknown, exclude confident men/women? No — unisex
 *   preference means the user wants unisex items, so exclude gendered ones.
 *
 * Returns kept listings (unknowns sorted after confident matches) + removal stats.
 */
export function filterByGender<T extends { title: string }>(
  listings: T[],
  preference: GenderPreference,
): GenderFilterResult<T> {
  if (preference === 'any') {
    return { kept: listings, removed: 0, removedTitles: [] };
  }

  const opposite = preference === 'men' ? 'women' : preference === 'women' ? 'men' : null;
  const kept: T[] = [];
  const unknowns: T[] = [];
  const removedTitles: string[] = [];

  for (const l of listings) {
    const g = detectListingGender(l.title);
    if (g === 'unisex') {
      kept.push(l); // unisex always passes
    } else if (opposite && g === opposite) {
      removedTitles.push(l.title); // hard-exclude confident opposite gender
    } else if (g === preference) {
      kept.push(l);
    } else if (g === 'unknown') {
      unknowns.push(l); // down-rank: kept but sorted after confident matches
    } else if (preference === 'unisex') {
      // user wants unisex items; gendered items don't match
      removedTitles.push(l.title);
    } else {
      kept.push(l);
    }
  }

  return { kept: [...kept, ...unknowns], removed: removedTitles.length, removedTitles };
}

/** localStorage flag, default OFF (follows Round 3 flag pattern). */
export function isGenderFilterEnabled(): boolean {
  try {
    return localStorage.getItem('shopsense-gender-filter') === '1';
  } catch {
    return false;
  }
}

export function setGenderFilterEnabled(on: boolean): void {
  try {
    localStorage.setItem('shopsense-gender-filter', on ? '1' : '0');
  } catch {
    /* ignore */
  }
}
