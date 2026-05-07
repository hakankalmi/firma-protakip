/**
 * Firma profil veri katmanı — Production: Brain.Api PublicCompanyController.
 *
 * SSR + ISR:
 * - generateStaticParams build-time'da bilinen slug'ları pre-render
 * - revalidate 300s ile yeni firma kaydı 5dk içinde sayfa olarak gelir
 * - Backend 404 → notFound() (Next.js otomatik 404 sayfası)
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "https://api.protakip.com/api";

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

function mapDtoToCompany(dto: PublicCompanyProfileDto): Company {
  return {
    slug: dto.slug,
    name: dto.name,
    sectorLabel: humanizeSector(dto.sector),
    city: dto.city ?? null,
    district: dto.district ?? null,
    address: dto.address ?? null,
    phone: dto.phone ?? null,
    whatsappPhone: dto.whatsappPhone ?? null,
    email: dto.email ?? null,
    website: dto.website ?? null,
    logoUrl: dto.logoUrl ?? null,
    // Backend doesn't currently expose these — kept as defaults for now.
    // Future schema additions (CompanyAbout, CompanyService, CompanyWorkingHours)
    // will populate them.
    about: null,
    services: [],
    workingHours: null,
    isVerified: false,
  };
}

function humanizeSector(sector?: string | null): string {
  if (!sector) return "Hizmet Firması";
  // Backend stores raw industry strings; map common ones to display labels
  const lower = sector.toLowerCase();
  if (lower.includes("halı") || lower.includes("hali")) return "Halı Yıkama";
  if (lower.includes("oto")) return "Oto Yıkama";
  if (lower.includes("klima")) return "Klima Servisi";
  if (lower.includes("tesisat")) return "Tesisat";
  if (lower.includes("temizlik")) return "Temizlik";
  if (lower.includes("kuru")) return "Kuru Temizleme";
  return sector;
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  if (!slug || slug.length > 120) return null;

  try {
    const res = await fetch(`${API_URL}/firmalar/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const dto = (await res.json()) as PublicCompanyProfileDto;
    return mapDtoToCompany(dto);
  } catch {
    return null;
  }
}

export async function getAllSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/firmalar/slugs`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const slugs = (await res.json()) as string[];
    // Limit prerender count for build performance — top N most recent
    return Array.isArray(slugs) ? slugs.slice(0, 100) : [];
  } catch {
    return [];
  }
}

export function buildWhatsAppLink(
  whatsappPhone: string | null,
  companyName: string,
): string | null {
  if (!whatsappPhone) return null;
  const message = encodeURIComponent(
    `Merhaba, ${companyName} firmanızdan bilgi almak istiyorum.`,
  );
  return `https://wa.me/${whatsappPhone}?text=${message}`;
}
