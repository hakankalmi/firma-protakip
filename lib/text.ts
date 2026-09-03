/**
 * Text helpers for user-entered profile fields (addresses, districts, cities).
 * Dependency-free on purpose.
 */

/** Values firms type into a field instead of leaving it empty. */
const PLACEHOLDER_VALUES = new Set([
  "adres",
  "telefon",
  "yok",
  "-",
  "--",
  ".",
  "0",
  "null",
  "undefined",
  "n/a",
  "bilinmiyor",
  "belirtilmedi",
  "belirtilmemiş",
]);

const TURKISH_ASCII: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  â: "a",
  î: "i",
  û: "u",
};

/** Trimmed, whitespace-collapsed text; null for empty or placeholder values. */
export function cleanText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (!collapsed || PLACEHOLDER_VALUES.has(collapsed.toLocaleLowerCase("tr-TR"))) {
    return null;
  }
  return collapsed;
}

export function hasText(value: string | null | undefined): value is string {
  return cleanText(value) !== null;
}

/** "ÖDEMİŞ" → "Ödemiş"; mixed-case input is left untouched. */
function titleCaseIfShouting(text: string): string {
  const upper = text.toLocaleUpperCase("tr-TR");
  const lower = text.toLocaleLowerCase("tr-TR");
  if (text !== upper || upper === lower) return text;
  return text
    .split(" ")
    .map((word) => word.charAt(0) + word.slice(1).toLocaleLowerCase("tr-TR"))
    .join(" ");
}

/** Place names (district, city) fixed for display. */
export function displayPlace(value: string | null | undefined): string | null {
  const text = cleanText(value);
  return text ? titleCaseIfShouting(text) : null;
}

/** Strips a typed-in "Adres:" label and fixes shouting case. */
export function cleanAddress(value: string | null | undefined): string | null {
  const text = cleanText(value);
  if (!text) return null;
  const withoutLabel = cleanText(text.replace(/^adres\s*[:\-–]\s*/i, ""));
  return withoutLabel ? titleCaseIfShouting(withoutLabel) : null;
}

/** Cuts at a word boundary and appends an ellipsis. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}

/** URL-fragment-safe id for in-page anchors ("İzmir" → "izmir"). */
export function anchorId(text: string): string {
  const ascii = text
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (ch) => TURKISH_ASCII[ch] ?? ch)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (ascii) return ascii;
  // Non-Latin scripts (e.g. "Алматы"): fall back to code points so ids stay unique.
  return `yer-${Array.from(text, (ch) => (ch.codePointAt(0) ?? 0).toString(16)).join("")}`;
}

/** Turkish country name for an ISO 3166-1 alpha-2 code ("DE" → "Almanya"). */
export function countryName(countryCode: string): string | null {
  try {
    const name = new Intl.DisplayNames(["tr"], { type: "region" }).of(countryCode);
    return name && name !== countryCode ? name : null;
  } catch {
    return null;
  }
}
