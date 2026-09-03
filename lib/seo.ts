/**
 * Single source of truth for everything crawlers see: which profiles are
 * "rich" enough to index (the sitemap and the noindex decision share this),
 * page titles / descriptions, canonical URLs and the LocalBusiness JSON-LD.
 */
import {
  GENERIC_SECTOR_LABEL,
  isValidSlug,
  type Company,
  type WorkingHours,
} from "./companies";
import {
  hasUsablePhone,
  isTurkishShortNumber,
  resolveTelephone,
  resolveWhatsAppDigits,
  toE164,
} from "./phone";
import { cleanAddress, cleanText, displayPlace, hasText, truncate } from "./text";

export const SITE_URL = "https://firma.protakip.com";
export const SITE_NAME = "ProTakip Firma Rehberi";

const MAX_DESCRIPTION_LENGTH = 160;
/** Test / demo accounts must never be indexed, however complete their profile is. */
const EXCLUDED_NAME_PATTERN = /(^|[^a-zçğıöşü])(deneme|test)($|[^a-zçğıöşü])/;
const OPENING_HOURS_PATTERN = /^(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})$/;

/** Canonical profile URL: absolute, no trailing slash, no query string. */
export function companyUrl(slug: string): string {
  return `${SITE_URL}/${slug}`;
}

export function isHttpUrl(value: string | null | undefined): value is string {
  if (!hasText(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export type RichnessSignals = {
  /** Usable phone or WhatsApp number. */
  contact: boolean;
  /** Street address, or district + city. */
  location: boolean;
  about: boolean;
  hours: boolean;
  logo: boolean;
};

export function richnessSignals(company: Company): RichnessSignals {
  return {
    contact: hasUsablePhone(company.phone, company.whatsappPhone, company.countryCode),
    location:
      cleanAddress(company.address) !== null ||
      (hasText(company.district) && hasText(company.city)),
    about: hasText(company.about),
    hours: company.workingHours !== null && hasText(company.workingHours.weekdays),
    logo: isHttpUrl(company.logoUrl),
  };
}

/**
 * A profile is worth indexing when it has a name and a valid slug AND at least
 * two of: usable phone/WhatsApp, address (or district + city), about text,
 * working hours, logo. The sitemap, the robots meta tag, the JSON-LD and the
 * home page directory all use this, so they can never disagree.
 */
export function isRichProfile(company: Company): boolean {
  if (!hasText(company.name) || !isValidSlug(company.slug)) return false;
  if (EXCLUDED_NAME_PATTERN.test(company.name.toLocaleLowerCase("tr-TR"))) return false;
  const signals = richnessSignals(company);
  const score = [
    signals.contact,
    signals.location,
    signals.about,
    signals.hours,
    signals.logo,
  ].filter(Boolean).length;
  return score >= 2;
}

/** "Armutlu, Yalova" / "Yalova" / null — duplicates ("Bakı, Bakı") collapsed. */
export function formatLocation(company: Company): string | null {
  const parts = [displayPlace(company.district), displayPlace(company.city)].filter(
    (part): part is string => part !== null,
  );
  const seen = new Set<string>();
  const unique = parts.filter((part) => {
    const key = part.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.length > 0 ? unique.join(", ") : null;
}

/** "{Firma adı} – {İlçe}, {Şehir}" — the root layout template appends " | ProTakip Firma Rehberi". */
export function buildCompanyTitle(company: Company): string {
  const location = formatLocation(company);
  return location ? `${company.name} – ${location}` : company.name;
}

function sectorPhrase(sectorLabel: string): string {
  if (sectorLabel === GENERIC_SECTOR_LABEL) return "hizmet firması";
  return `${sectorLabel.toLocaleLowerCase("tr-TR")} firması`;
}

function contactPhrase(company: Company): string | null {
  const hasPhone =
    toE164(company.phone, company.countryCode) !== null ||
    isTurkishShortNumber(company.phone);
  const hasWhatsApp =
    resolveWhatsAppDigits(company.phone, company.whatsappPhone, company.countryCode) !== null;
  if (hasPhone && hasWhatsApp) return "Telefon ve WhatsApp ile doğrudan ulaşın.";
  if (hasWhatsApp) return "WhatsApp ile doğrudan ulaşın.";
  if (hasPhone) return "Telefonla ulaşın.";
  return null;
}

/** Meta description assembled only from fields the profile really has (≤ 160 chars). */
export function buildCompanyDescription(company: Company): string {
  const location = formatLocation(company);
  const sentences: string[] = [];

  const about = cleanText(company.about);
  if (about) {
    sentences.push(truncate(about, MAX_DESCRIPTION_LENGTH - 40));
  } else if (location) {
    sentences.push(`${company.name} – ${location} bölgesinde ${sectorPhrase(company.sectorLabel)}.`);
  } else {
    sentences.push(`${company.name} – ${sectorPhrase(company.sectorLabel)}.`);
  }

  if (company.services.length > 0) {
    sentences.push(`Hizmetler: ${company.services.slice(0, 4).join(", ")}.`);
  }

  const contact = contactPhrase(company);
  if (contact) sentences.push(contact);

  const address = cleanAddress(company.address);
  if (address) {
    const withAddress = [...sentences, `Adres: ${address}.`].join(" ");
    if (withAddress.length <= MAX_DESCRIPTION_LENGTH) return withAddress;
  }
  return truncate(sentences.join(" "), MAX_DESCRIPTION_LENGTH);
}

function normalizeWebsite(website: string | null): string | null {
  const text = cleanText(website);
  if (!text || text.includes("@") || text.includes("firma.protakip.com")) return null;
  const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    return url.hostname.includes(".") ? url.href : null;
  } catch {
    return null;
  }
}

function openingHoursEntry(dayRange: string, value: string | null): string | null {
  const text = cleanText(value);
  if (!text) return null;
  const match = OPENING_HOURS_PATTERN.exec(text);
  if (!match) return null;
  const pad = (hour: string) => hour.padStart(2, "0");
  return `${dayRange} ${pad(match[1])}:${match[2]}-${pad(match[3])}:${match[4]}`;
}

/** schema.org openingHours strings ("Mo-Fr 09:00-18:00"); free-text hours are skipped. */
function buildOpeningHours(hours: WorkingHours | null): string[] {
  if (!hours) return [];
  return [
    openingHoursEntry("Mo-Fr", hours.weekdays),
    openingHoursEntry("Sa", hours.saturday),
    openingHoursEntry("Su", hours.sunday),
  ].filter((entry): entry is string => entry !== null);
}

/** schema.org LocalBusiness with only the fields the profile actually has. */
export function buildLocalBusinessJsonLd(company: Company): Record<string, unknown> {
  const url = companyUrl(company.slug);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${url}#localbusiness`,
    name: company.name,
    url,
  };

  const about = cleanText(company.about);
  if (about) jsonLd.description = about;

  const telephone = resolveTelephone(company.phone, company.whatsappPhone, company.countryCode);
  if (telephone) jsonLd.telephone = telephone;

  const streetAddress = cleanAddress(company.address);
  const district = displayPlace(company.district);
  const city = displayPlace(company.city);
  if (streetAddress || district || city) {
    const address: Record<string, string> = {
      "@type": "PostalAddress",
      addressCountry: company.countryCode,
    };
    if (streetAddress) address.streetAddress = streetAddress;
    const locality = district ?? city;
    if (locality) address.addressLocality = locality;
    if (
      district &&
      city &&
      district.toLocaleLowerCase("tr-TR") !== city.toLocaleLowerCase("tr-TR")
    ) {
      address.addressRegion = city;
    }
    jsonLd.address = address;
  }

  if (isHttpUrl(company.logoUrl)) {
    jsonLd.image = company.logoUrl;
    jsonLd.logo = company.logoUrl;
  }

  const openingHours = buildOpeningHours(company.workingHours);
  if (openingHours.length > 0) jsonLd.openingHours = openingHours;

  const website = normalizeWebsite(company.website);
  if (website) jsonLd.sameAs = [website];

  return jsonLd;
}

/** JSON-LD safe to inline in a <script>: "<", ">" and "&" can never close the tag. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
