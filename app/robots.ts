import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Search crawlers (Googlebot, Bingbot, ...) may crawl everything; only
 * AI-training crawlers are blocked. Thin profiles are kept out of the index
 * with a noindex meta tag, not here, so their links are still followed.
 *
 * Cloudflare's managed "Content Signals" block is prepended at the edge; the
 * directives below are served verbatim after it.
 */
const AI_TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "CCBot",
  "Google-Extended",
  "Bytespider",
  "anthropic-ai",
  "PerplexityBot",
  "Amazonbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: AI_TRAINING_BOTS, disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
