/**
 * Firma profil veri katmanı — Production: Brain.Api PublicCompanyController.
 *
 * Endpoints (anonymous, CDN-cacheable):
 * - GET /api/firmalar/slugs   → string[]  (all active slugs)
 * - GET /api/firmalar/{slug}  → PublicCompanyProfileDto | 404
 *
 * Caching:
 * - Single profile (page render): fetch revalidate 300 s, so a new or edited
 *   firm shows up within 5 minutes.
 * - Directory (home page + sitemap): the same URLs with revalidate 3600 s. Next
 *   keys its fetch cache by URL, not by revalidate, so both consumers share the
 *   cached entries and each applies its own freshness window.
 */
import { resolveWhatsAppDigits } from "./phone";
import { anchorId, cleanText, countryName, displayPlace } from "./text";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "https://api.protakip.com/api";

const PROFILE_REVALIDATE_SECONDS = 300;
const DIRECTORY_REVALIDATE_SECONDS = 3600;
const DIRECTORY_FETCH_CONCURRENCY = 8;
/** How many profile pages `generateStaticParams` pre-renders at build time. */
export const PRERENDER_LIMIT = 100;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 120;

export const GENERIC_SECTOR_LABEL = "Hizmet Firması";
const OTHER_CITY_LABEL = "Diğer";

export type WorkingHours = {
  weekdays: string;
  saturday: string | null;
  sunday: string | null;
};

export type Company = {
  slug: string;
  name: string;
  sectorLabel: string;
  city: string | null;
  district: string | null;
  address: string | null;
  phone: string | null;
  whatsappPhone: string | null;
  email: string | null;
  website: string | null;
  about: string | null;
  services: string[];
  workingHours: WorkingHours | null;
  logoUrl: string | null;
  /** ISO 3166-1 alpha-2, "TR" when the backend sends nothing. */
  countryCode: string;
  isVerified: boolean;
};

interface PublicCompanyProfileDto {
  slug: string;
  name: string;
  sector?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsappPhone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  countryCode?: string | null;
}

export function isValidSlug(slug: unknown): slug is string {
  return (
    typeof slug === "string" &&
    slug.length > 0 &&
    slug.length <= MAX_SLUG_LENGTH &&
    SLUG_PATTERN.test(slug)
  );
}

function mapDtoToCompany(dto: PublicCompanyProfileDto): Company {
  const name = cleanText(dto.name) ?? dto.slug;
  return {
    slug: dto.slug,
    name,
    sectorLabel: humanizeSector(dto.sector, name),
    city: cleanText(dto.city),
    district: cleanText(dto.district),
    address: cleanText(dto.address),
    phone: cleanText(dto.phone),
    whatsappPhone: cleanText(dto.whatsappPhone),
    email: cleanText(dto.email),
    website: cleanText(dto.website),
    logoUrl: cleanText(dto.logoUrl),
    countryCode: cleanText(dto.countryCode)?.toUpperCase() ?? "TR",
    // The backend does not expose these yet — future schema additions
    // (CompanyAbout, CompanyService, CompanyWorkingHours) will populate them.
    about: null,
    services: [],
    workingHours: null,
    isVerified: false,
  };
}

/** Backend `Industry` codes → display labels. Order matters ("carpet" before "car"). */
const SECTOR_LABELS_BY_CODE: Array<[RegExp, string]> = [
  [/carpet|hal[ıi]|teppich/, "Halı Yıkama"],
  [/upholster|koltuk/, "Koltuk Yıkama"],
  [/car ?wash|auto|oto/, "Oto Yıkama"],
  [/dry ?clean|kuru/, "Kuru Temizleme"],
  [/hvac|klima/, "Klima Servisi"],
  [/plumb|tesisat/, "Tesisat"],
  [/clean|temizlik/, "Temizlik"],
];

/**
 * Most firms leave `Industry` empty but carry the sector in their name
 * ("Emin Halı Yıkama", "Günel Koltuk Yıkama", "Teppich-Clean 24").
 */
const SECTOR_LABELS_BY_NAME: Array<[RegExp, string]> = [
  [/kuru temizleme|dry ?clean/, "Kuru Temizleme"],
  [/(^|[^a-zçğıöşü])hal[ıi]([^a-zçğıöşü]|$)|teppich|carpet|xal[cç]a|covoare|tapis/, "Halı Yıkama"],
  [/koltuk/, "Koltuk Yıkama"],
  [/(^|[^a-zçğıöşü])oto([^a-zçğıöşü]|$)|car ?wash/, "Oto Yıkama"],
  [/klima/, "Klima Servisi"],
  [/tesisat/, "Tesisat"],
  [/temizlik|cleaning|clean($|[^a-z])|nettoyage|reinigung|(^|[^a-zçğıöşü])tem($|[^a-zçğıöşü])/, "Temizlik"],
  [/y[ıi]kama/, "Halı Yıkama"],
];

function humanizeSector(sector: string | null | undefined, name: string): string {
  const code = cleanText(sector);
  if (code) {
    const lowerCode = code.toLocaleLowerCase("tr-TR");
    const known = SECTOR_LABELS_BY_CODE.find(([pattern]) => pattern.test(lowerCode));
    return known ? known[1] : code;
  }
  const lowerName = name.toLocaleLowerCase("tr-TR");
  const inferred = SECTOR_LABELS_BY_NAME.find(([pattern]) => pattern.test(lowerName));
  return inferred ? inferred[1] : GENERIC_SECTOR_LABEL;
}

type ProfileFetchResult =
  | { status: "ok"; company: Company }
  | { status: "missing" }
  | { status: "error" };

async function fetchProfile(
  slug: string,
  revalidateSeconds: number,
): Promise<ProfileFetchResult> {
  try {
    const res = await fetch(`${API_URL}/firmalar/${encodeURIComponent(slug)}`, {
      next: { revalidate: revalidateSeconds },
    });
    if (res.status === 404) return { status: "missing" };
    if (!res.ok) return { status: "error" };
    const dto = (await res.json()) as PublicCompanyProfileDto;
    if (!isValidSlug(dto?.slug)) return { status: "missing" };
    return { status: "ok", company: mapDtoToCompany(dto) };
  } catch {
    return { status: "error" };
  }
}

async function fetchSlugList(revalidateSeconds: number): Promise<string[] | null> {
  try {
    const res = await fetch(`${API_URL}/firmalar/slugs`, {
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) return null;
    const payload: unknown = await res.json();
    if (!Array.isArray(payload)) return null;
    return Array.from(new Set(payload.filter(isValidSlug)));
  } catch {
    return null;
  }
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  if (!isValidSlug(slug)) return null;
  const result = await fetchProfile(slug, PROFILE_REVALIDATE_SECONDS);
  return result.status === "ok" ? result.company : null;
}

/** All active slugs in API order (newest first); empty when the API is unreachable. */
export async function getAllSlugs(): Promise<string[]> {
  return (await fetchSlugList(DIRECTORY_REVALIDATE_SECONDS)) ?? [];
}

/**
 * Every active company profile, sorted by name — the source for the home page
 * directory and the sitemap. Throws when the slug list itself cannot be fetched,
 * so an ISR regeneration keeps serving the last good version instead of an
 * empty directory / empty sitemap.
 */
export async function getAllCompanies(): Promise<Company[]> {
  const slugs = await fetchSlugList(DIRECTORY_REVALIDATE_SECONDS);
  if (slugs === null) {
    throw new Error("Company directory is unavailable: the slug list could not be fetched");
  }

  const companies: Company[] = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < slugs.length) {
      const slug = slugs[cursor++];
      let result = await fetchProfile(slug, DIRECTORY_REVALIDATE_SECONDS);
      if (result.status === "error") {
        // One retry for transient failures, so a hiccup cannot drop a firm from the sitemap.
        result = await fetchProfile(slug, DIRECTORY_REVALIDATE_SECONDS);
      }
      if (result.status === "ok") companies.push(result.company);
    }
  };
  await Promise.all(Array.from({ length: DIRECTORY_FETCH_CONCURRENCY }, worker));

  const collator = new Intl.Collator("tr");
  return companies.sort((a, b) => collator.compare(a.name, b.name));
}

export function buildWhatsAppLink(company: Company): string | null {
  const digits = resolveWhatsAppDigits(
    company.phone,
    company.whatsappPhone,
    company.countryCode,
  );
  if (!digits) return null;
  const message = encodeURIComponent(
    `Merhaba, ${company.name} firmanızdan bilgi almak istiyorum.`,
  );
  return `https://wa.me/${digits}?text=${message}`;
}

export type CityGroup = {
  /** In-page anchor id, also used by profile pages to link back to their city. */
  id: string;
  city: string;
  countryCode: string;
  /** Turkish country name for firms outside Türkiye, null for TR. */
  countryName: string | null;
  companies: Company[];
};

export function cityAnchorId(company: Pick<Company, "city" | "countryCode">): string {
  const city = displayPlace(company.city) ?? OTHER_CITY_LABEL;
  return anchorId(company.countryCode === "TR" ? city : `${company.countryCode}-${city}`);
}

/** Groups by city (Türkiye first, then other countries, unknown city last), each sorted by name. */
export function groupCompaniesByCity(companies: Company[]): CityGroup[] {
  const groups = new Map<string, CityGroup>();
  for (const company of companies) {
    const id = cityAnchorId(company);
    let group = groups.get(id);
    if (!group) {
      group = {
        id,
        city: displayPlace(company.city) ?? OTHER_CITY_LABEL,
        countryCode: company.countryCode,
        countryName: company.countryCode === "TR" ? null : countryName(company.countryCode),
        companies: [],
      };
      groups.set(id, group);
    }
    group.companies.push(company);
  }

  const collator = new Intl.Collator("tr");
  const rank = (group: CityGroup) =>
    group.city === OTHER_CITY_LABEL ? 2 : group.countryCode === "TR" ? 0 : 1;
  return [...groups.values()]
    .map((group) => ({
      ...group,
      companies: [...group.companies].sort((a, b) => collator.compare(a.name, b.name)),
    }))
    .sort((a, b) => rank(a) - rank(b) || collator.compare(a.city, b.city));
}
