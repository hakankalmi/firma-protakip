import type { MetadataRoute } from "next";
import { getAllCompanies } from "@/lib/companies";
import { companyUrl, isRichProfile, SITE_URL } from "@/lib/seo";

/**
 * Only the home page and RICH profiles (see `isRichProfile`) — never a page
 * that carries a noindex tag. Regenerated at most once an hour; when the API
 * is unreachable the previous sitemap keeps being served (ISR keeps the last
 * good response on error).
 *
 * `lastModified` is intentionally absent: the public API exposes no update
 * timestamp and a fabricated date would only teach crawlers to ignore it.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const companies = await getAllCompanies();

  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
  ];
  for (const company of companies) {
    if (!isRichProfile(company)) continue;
    entries.push({
      url: companyUrl(company.slug),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }
  return entries;
}
