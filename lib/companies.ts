/**
 * Firma profil veri katmanı.
 * Şu an mock data ile çalışıyor.
 * Backend hazır olunca (Company.PublicSlug migration + GET /api/firmalar/{slug}):
 *   getCompanyBySlug → fetch(`${API_URL}/firmalar/${slug}`, { next: { revalidate: 300 } })
 *   getAllSlugs → fetch(`${API_URL}/firmalar/slugs`)
 *
 * SSR + ISR kullanılıyor:
 * - generateStaticParams ile build-time'da bilinen slug'lar pre-rendered
 * - revalidate ile 5 dakikada bir cache invalidate (yeni firma kayıt → 5dk içinde sayfa hazır)
 */

export type WorkingHours = {
  weekdays: string; // "08:00 - 19:00"
  saturday: string | null;
  sunday: string | null;
};

export type Company = {
  slug: string;
  name: string;
  sector:
    | "hali-yikama"
    | "oto-yikama"
    | "klima-servis"
    | "tesisat"
    | "temizlik"
    | "kuru-temizleme"
    | "diger";
  sectorLabel: string;
  city: string;
  district: string | null;
  address: string;
  phone: string; // E.164 format: +905431234567
  whatsappPhone: string; // wa.me link için, country code'suz: 905431234567
  email: string | null;
  website: string | null;
  about: string;
  services: string[];
  workingHours: WorkingHours;
  logoUrl: string | null;
  coverImageUrl: string | null;
  isVerified: boolean;
  isProTakipUser: boolean; // Daima true (firma.protakip.com'da yer alma şartı)
};

const MOCK_COMPANIES: Company[] = [
  {
    slug: "hali-sepeti-konya",
    name: "Halı Sepeti Halı Yıkama",
    sector: "hali-yikama",
    sectorLabel: "Halı Yıkama",
    city: "Konya",
    district: "Selçuklu",
    address: "Yazır Mah. Yeni İstanbul Cad. No:42, Selçuklu / Konya",
    phone: "+903325551234",
    whatsappPhone: "903325551234",
    email: "info@halisepeti.com",
    website: null,
    about:
      "20 yıllık tecrübe ile halı yıkama, kaliteli kimyasallar, hijyenik ortamda yıkama. Ücretsiz alma-getirme servisi mevcuttur.",
    services: [
      "Halı yıkama",
      "Koltuk yıkama",
      "Battaniye yıkama",
      "Stor perde yıkama",
      "Ücretsiz alma-getirme",
    ],
    workingHours: {
      weekdays: "08:00 - 19:00",
      saturday: "09:00 - 18:00",
      sunday: null,
    },
    logoUrl: null,
    coverImageUrl: null,
    isVerified: true,
    isProTakipUser: true,
  },
];

/**
 * Slug'a göre firma bilgisini getir.
 * Backend hazır olunca: fetch(`${process.env.API_URL}/firmalar/${slug}`).
 */
export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  // TODO: Backend GET /api/firmalar/{slug} hazır olunca production'da çek
  // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/firmalar/${slug}`, {
  //   next: { revalidate: 300 } // 5 dakika ISR
  // });
  // if (!res.ok) return null;
  // return res.json();

  return MOCK_COMPANIES.find((c) => c.slug === slug) ?? null;
}

/**
 * Build time'da pre-rendering için tüm slug'ları getir.
 * Backend hazır olunca: paginated fetch + ISR ile yeni eklenenler 5dk içinde gelir.
 */
export async function getAllSlugs(): Promise<string[]> {
  // TODO: const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/firmalar/slugs`);
  return MOCK_COMPANIES.map((c) => c.slug);
}

/**
 * WhatsApp deep-link oluştur. Mesaj template'i pre-fill ile.
 */
export function buildWhatsAppLink(
  whatsappPhone: string,
  companyName: string,
): string {
  const message = encodeURIComponent(
    `Merhaba, ${companyName} firmanızdan bilgi almak istiyorum.`,
  );
  return `https://wa.me/${whatsappPhone}?text=${message}`;
}
