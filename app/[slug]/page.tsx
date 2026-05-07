import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  getCompanyBySlug,
  getAllSlugs,
  buildWhatsAppLink,
  type Company,
} from "@/lib/companies";

// ─────────────────────────────────────────────────────────────────────────────
// SSR config: 5dk ISR, build time'da bilinen slug'lar pre-render
// ─────────────────────────────────────────────────────────────────────────────
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO + Open Graph (FB crawler-friendly)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);

  if (!company) {
    return { title: "Firma bulunamadı" };
  }

  const cityPart = company.city ? `, ${company.city}` : "";
  const title = `${company.name} — ${company.sectorLabel}${cityPart}`;
  const descParts = [
    company.name,
    company.city,
    company.district,
    `${company.sectorLabel} hizmeti`,
  ].filter(Boolean);
  const phoneInfo = company.phone ? ` WhatsApp ile ${company.phone} numarasından ulaşabilirsiniz.` : "";
  const description = `${descParts.join(" ")}.${phoneInfo}`;
  const url = `https://firma.protakip.com/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url,
      siteName: "ProTakip",
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);

  if (!company) {
    notFound();
  }

  return <CompanyProfileView company={company} />;
}

function CompanyProfileView({ company }: { company: Company }) {
  const waLink = buildWhatsAppLink(company.whatsappPhone, company.name);

  // JSON-LD LocalBusiness schema
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: company.name,
    url: `https://firma.protakip.com/${company.slug}`,
  };
  if (company.about) jsonLd.description = company.about;
  if (company.address) {
    jsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: company.address,
      addressLocality: company.district ?? company.city,
      addressRegion: company.city,
      addressCountry: "TR",
    };
  }
  if (company.phone) jsonLd.telephone = company.phone;
  if (company.email) jsonLd.email = company.email;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen bg-zinc-50">
        <div className="h-32 md:h-48 bg-gradient-to-br from-emerald-500 via-emerald-600 to-cyan-600" />

        <div className="max-w-3xl mx-auto px-4 -mt-16 md:-mt-20 pb-16">
          <div className="bg-white rounded-2xl shadow-xl shadow-zinc-900/5 border border-zinc-200 overflow-hidden">
            {/* Header + CTAs */}
            <div className="p-6 md:p-8 border-b border-zinc-100">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {company.sectorLabel}
                    </span>
                    {company.isVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Doğrulandı
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 leading-tight">
                    {company.name}
                  </h1>
                  {(company.district || company.city) && (
                    <p className="text-sm text-zinc-500 mt-1">
                      {company.district ? `${company.district}, ` : ""}
                      {company.city}
                    </p>
                  )}
                </div>
              </div>

              {/* WhatsApp CTA — only if number known */}
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold shadow-lg shadow-emerald-500/30 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                  WhatsApp&apos;tan Mesaj Gönder
                </a>
              ) : null}

              {company.phone && (
                <a
                  href={`tel:${company.phone}`}
                  className={`flex items-center justify-center gap-2 w-full ${waLink ? "mt-3" : ""} px-6 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold transition-colors`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {company.phone}
                </a>
              )}
            </div>

            {company.about && (
              <Section title="Hakkında">
                <p className="text-zinc-700 leading-relaxed">{company.about}</p>
              </Section>
            )}

            {company.services.length > 0 && (
              <Section title="Hizmetler">
                <div className="flex flex-wrap gap-2">
                  {company.services.map((service) => (
                    <span
                      key={service}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-zinc-100 text-zinc-700 border border-zinc-200"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {company.workingHours && (
              <Section title="Çalışma Saatleri">
                <dl className="space-y-2 text-sm">
                  <Row label="Hafta içi" value={company.workingHours.weekdays} />
                  <Row
                    label="Cumartesi"
                    value={company.workingHours.saturday ?? "Kapalı"}
                    muted={!company.workingHours.saturday}
                  />
                  <Row
                    label="Pazar"
                    value={company.workingHours.sunday ?? "Kapalı"}
                    muted={!company.workingHours.sunday}
                  />
                </dl>
              </Section>
            )}

            {company.address && (
              <Section title="Adres">
                <p className="text-zinc-700 leading-relaxed">{company.address}</p>
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(company.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  Google Maps&apos;te Aç
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </Section>
            )}

            {company.website && (
              <Section title="İnternet Sitesi">
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-emerald-600 hover:text-emerald-700 break-all"
                >
                  {company.website}
                </a>
              </Section>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link
              href="https://protakip.com"
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              ProTakip ile yönetiliyor
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 md:p-8 border-b border-zinc-100 last:border-b-0">
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={muted ? "text-zinc-400" : "text-zinc-900 font-medium"}>{value}</dd>
    </div>
  );
}
