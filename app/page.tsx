import type { Metadata } from "next";
import Link from "next/link";
import { getAllCompanies, groupCompaniesByCity } from "@/lib/companies";
import { isRichProfile, SITE_NAME, SITE_URL } from "@/lib/seo";
import { displayPlace } from "@/lib/text";

// The directory is rebuilt at most once an hour (matches the directory fetches).
export const revalidate = 3600;

const HOME_TITLE = `${SITE_NAME} – Şehre Göre Halı Yıkama ve Hizmet Firmaları`;
const HOME_DESCRIPTION =
  "Halı yıkama, koltuk yıkama, temizlik ve diğer hizmet firmalarının şehre göre listelendiği ProTakip Firma Rehberi. Her firmanın adresi, telefonu ve WhatsApp bağlantısı tek sayfada.";

export const metadata: Metadata = {
  // Bu host arama icin degil (Hakan 25.09) — firma rehberi de dizine girmez.
  robots: { index: false, follow: true },
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

export default async function HomePage() {
  // Only profiles that are indexable get a link: thin ones carry noindex and
  // would only waste crawl budget here.
  const companies = (await getAllCompanies()).filter(isRichProfile);
  const cityGroups = groupCompaniesByCity(companies);

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg
                className="w-8 h-8 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
            </div>
            <span className="text-3xl font-bold tracking-tight text-zinc-900">
              ProTakip
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-6 leading-tight">
            Hizmet sektörünün
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
              firma rehberi
            </span>
          </h1>
          <p className="text-lg text-zinc-600 leading-relaxed max-w-xl mx-auto">
            Halı yıkama, koltuk yıkama, temizlik, oto yıkama ve daha pek çok
            sektörde ProTakip ile çalışan firmaların profilleri burada. Şehrinizi
            seçin, firmaya tek tıkla WhatsApp&apos;tan ulaşın.
          </p>
        </header>

        {cityGroups.length > 0 ? (
          <>
            <nav aria-label="Şehirler" className="mb-12">
              <h2 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-4 text-center">
                Şehre göre firmalar
              </h2>
              <ul className="flex flex-wrap justify-center gap-2">
                {cityGroups.map((group) => (
                  <li key={group.id}>
                    <a
                      href={`#${group.id}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-white text-zinc-700 border border-zinc-200 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                    >
                      {group.city}
                      {group.countryName ? ` (${group.countryName})` : ""}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-12">
              {cityGroups.map((group) => (
                <section key={group.id} id={group.id} className="scroll-mt-24">
                  <h2 className="text-xl font-bold text-zinc-900 mb-4 flex items-baseline gap-2">
                    {group.city}
                    {group.countryName && (
                      <span className="text-sm font-medium text-zinc-500">
                        {group.countryName}
                      </span>
                    )}
                  </h2>
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.companies.map((company) => {
                      const district = displayPlace(company.district);
                      const detail = [
                        district &&
                        district.toLocaleLowerCase("tr-TR") !==
                          group.city.toLocaleLowerCase("tr-TR")
                          ? district
                          : null,
                        company.sectorLabel,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <li key={company.slug}>
                          <Link
                            href={`/${company.slug}`}
                            prefetch={false}
                            className="block h-full rounded-xl bg-white border border-zinc-200 px-4 py-3 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all"
                          >
                            <span className="block font-semibold text-zinc-900 leading-snug">
                              {company.name}
                            </span>
                            <span className="block text-sm text-zinc-500 mt-0.5">
                              {detail}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-zinc-600">
            Firma listesi hazırlanıyor, lütfen biraz sonra tekrar bakın.
          </p>
        )}

        <div className="mt-16 bg-white rounded-2xl shadow-xl shadow-emerald-500/5 border border-zinc-200 p-8 text-center">
          <h2 className="text-2xl font-bold text-zinc-900 mb-3">
            Firmanız da burada yer alsın
          </h2>
          <p className="text-zinc-600 mb-6 leading-relaxed max-w-xl mx-auto">
            ProTakip&apos;e kayıtlı her firmanın kendi profil sayfası ve doğrudan
            WhatsApp bağlantısı otomatik olarak bu rehberde yayınlanır.
          </p>
          <Link
            href="https://protakip.com"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 text-white font-semibold hover:bg-zinc-800 transition-colors"
          >
            ProTakip hakkında bilgi al
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}
