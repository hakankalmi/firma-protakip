/**
 * Phone helpers shared by the profile page (tel: / WhatsApp links), the SEO
 * layer (JSON-LD `telephone`, the "usable phone" richness signal) and the data
 * layer. Dependency-free on purpose.
 *
 * What the backend (PublicCompanyController) actually sends:
 * - `phone`: the raw stored string — "05xx...", "+90 5xx...", "0212 ... - 0530 ..."
 *   (two numbers), "03266187141 *42" (extension) or placeholder text ("Telefon").
 * - `whatsappPhone`: digits prefixed with "90" regardless of the firm's country,
 *   so foreign firms arrive as "90" + national number.
 */

/** ITU calling codes for the countries that currently have profiles (+ a few neighbours). */
const DIAL_CODES: Record<string, string> = {
  TR: "90",
  DE: "49",
  AT: "43",
  BE: "32",
  NL: "31",
  FR: "33",
  GB: "44",
  PT: "351",
  RO: "40",
  RU: "7",
  KZ: "7",
  GE: "995",
  AM: "374",
  AZ: "994",
  TH: "66",
  BR: "55",
  US: "1",
};

/** National trunk prefix that is dropped before the country code is added. */
const TRUNK_PREFIXES: Record<string, string> = { RU: "8", KZ: "8" };
const DEFAULT_TRUNK_PREFIX = "0";

const E164_MIN_DIGITS = 8;
const E164_MAX_DIGITS = 15;
/** "90" + 10 national digits. */
const TR_E164_LENGTH = 12;
/** Separators people type between two numbers or before an extension. */
const NUMBER_SEPARATOR = /\s*(?:[-–/,;|*]|\bve\b)\s*/i;

export function extractDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeCountryCode(countryCode: string | null | undefined): string {
  const code = (countryCode ?? "").trim().toUpperCase();
  return code.length === 2 ? code : "TR";
}

/** "05999999999", "5555555555": a subscriber part made of at most two distinct digits. */
function looksFake(e164Digits: string): boolean {
  return new Set(e164Digits.slice(-9)).size <= 2;
}

function isPlausibleE164(digits: string): boolean {
  return (
    digits.length >= E164_MIN_DIGITS &&
    digits.length <= E164_MAX_DIGITS &&
    !looksFake(digits)
  );
}

/** Turkish "444 x xxx" corporate short numbers: dialable, but never on WhatsApp. */
export function isTurkishShortNumber(value: string | null | undefined): boolean {
  return /^444\d{4}$/.test(extractDigits(value));
}

function normalizeTurkishDigits(raw: string, digits: string): string | null {
  if (raw.startsWith("+")) {
    return digits.startsWith("90") && digits.length >= TR_E164_LENGTH
      ? digits.slice(0, TR_E164_LENGTH)
      : null;
  }
  if (digits.startsWith("0090") && digits.length >= TR_E164_LENGTH + 2) {
    return digits.slice(2, TR_E164_LENGTH + 2);
  }
  // "90" + 10 digits, possibly followed by a second number or an extension.
  if (digits.startsWith("90") && digits.length >= TR_E164_LENGTH) {
    return digits.slice(0, TR_E164_LENGTH);
  }
  // National "0" + area/mobile code (2-5) + 8 digits, possibly followed by more.
  if (/^0[2-5]\d{9}/.test(digits)) return `90${digits.slice(1, 11)}`;
  // National number without the leading zero.
  if (/^[2-5]\d{9}$/.test(digits)) return `90${digits}`;
  return null;
}

function normalizeTurkish(raw: string): string | null {
  const whole = normalizeTurkishDigits(raw, extractDigits(raw));
  if (whole) return whole;
  // "6142882-05534773333": a local number without area code followed by a full
  // mobile number — try each separated part on its own.
  for (const part of raw.split(NUMBER_SEPARATOR)) {
    const candidate = normalizeTurkishDigits(part.trim(), extractDigits(part));
    if (candidate) return candidate;
  }
  return null;
}

function normalizeForeign(raw: string, countryCode: string): string | null {
  const digits = extractDigits(raw);
  if (raw.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  const dialCode = DIAL_CODES[countryCode];
  if (!dialCode) return null;
  const trunkPrefix = TRUNK_PREFIXES[countryCode] ?? DEFAULT_TRUNK_PREFIX;
  let national = digits;
  // Backend artifact: whatsappPhone is always "90"-prefixed, even for foreign firms.
  if (national.startsWith("90") && national.length > 10) national = national.slice(2);
  if (national.startsWith(trunkPrefix)) {
    return dialCode + national.slice(trunkPrefix.length);
  }
  // Already international without the "+" (e.g. "79054979502" for RU).
  if (national.startsWith(dialCode) && national.length > dialCode.length + 7) {
    return national;
  }
  return dialCode + national;
}

/**
 * Best-effort E.164 digits (without "+") for a stored phone string, or null when
 * no dialable number can be recognised. It never guesses: a wrong number is
 * worse than none in JSON-LD and WhatsApp links.
 */
export function normalizePhoneDigits(
  raw: string | null | undefined,
  countryCode?: string | null,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (extractDigits(trimmed).length < E164_MIN_DIGITS) return null;
  const code = normalizeCountryCode(countryCode);
  const digits =
    code === "TR" ? normalizeTurkish(trimmed) : normalizeForeign(trimmed, code);
  return digits && isPlausibleE164(digits) ? digits : null;
}

export function toE164(
  raw: string | null | undefined,
  countryCode?: string | null,
): string | null {
  const digits = normalizePhoneDigits(raw, countryCode);
  return digits ? `+${digits}` : null;
}

/**
 * Mirrors the backend NormalizeForWhatsApp routine so we can tell whether
 * `whatsappPhone` was derived from the very same string as `phone`.
 */
function backendWhatsAppShape(raw: string): string | null {
  const digits = extractDigits(raw);
  if (!digits) return null;
  if (digits.startsWith("90") && digits.length >= TR_E164_LENGTH) return digits;
  return `90${digits.startsWith("0") ? digits.slice(1) : digits}`;
}

/**
 * Digits for a wa.me link. When the backend built `whatsappPhone` from the same
 * string as `phone`, the raw string is re-parsed (it still has the separators
 * the backend threw away); otherwise the whatsappPhone digits are normalised.
 */
export function resolveWhatsAppDigits(
  phone: string | null | undefined,
  whatsappPhone: string | null | undefined,
  countryCode?: string | null,
): string | null {
  if (!whatsappPhone) return null;
  const whatsappDigits = extractDigits(whatsappPhone);
  if (!whatsappDigits) return null;
  if (phone && backendWhatsAppShape(phone) === whatsappDigits) {
    return normalizePhoneDigits(phone, countryCode);
  }
  return normalizePhoneDigits(whatsappPhone, countryCode);
}

/**
 * The number to publish as the business telephone: E.164 ("+905…"), a Turkish
 * 444 short number, or — when the display phone is unusable — the WhatsApp number.
 */
export function resolveTelephone(
  phone: string | null | undefined,
  whatsappPhone: string | null | undefined,
  countryCode?: string | null,
): string | null {
  const e164 = toE164(phone, countryCode);
  if (e164) return e164;
  if (normalizeCountryCode(countryCode) === "TR" && isTurkishShortNumber(phone)) {
    return extractDigits(phone);
  }
  const whatsappDigits = resolveWhatsAppDigits(phone, whatsappPhone, countryCode);
  return whatsappDigits ? `+${whatsappDigits}` : null;
}

export function hasUsablePhone(
  phone: string | null | undefined,
  whatsappPhone: string | null | undefined,
  countryCode?: string | null,
): boolean {
  return resolveTelephone(phone, whatsappPhone, countryCode) !== null;
}

/** "+905363737596" → "0536 373 75 96"; other countries keep the international form. */
export function formatPhoneForDisplay(telephone: string): string {
  const digits = extractDigits(telephone);
  if (
    telephone.startsWith("+") &&
    digits.startsWith("90") &&
    digits.length === TR_E164_LENGTH
  ) {
    return `0${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }
  if (isTurkishShortNumber(telephone)) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 4)} ${digits.slice(4)}`;
  }
  return telephone;
}
