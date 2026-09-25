import type { MetadataRoute } from "next";

/**
 * Bu host arama icin DEGIL: web sitesi olmayan firmalar WhatsApp Business
 * baglantisinda bir adres istendigi icin var (Hakan 25.09). Butun sayfalar
 * `noindex` meta etiketi tasir ve SITE HARITASI YOK.
 *
 * 🔴 Arama botlarina yine de ACIK kalinir: robots.txt ile engellenen bir
 * sayfayi Google OKUYAMAZ, dolayisiyla noindex'i de goremez ve adres dizinde
 * asili kalabilir. Engelleme degil, okutup noindex gostermek dogru yol.
 *
 * Yalniz yapay zeka egitim botlari engellenir.
 *
 * Cloudflare'in yonetilen "Content Signals" blogu kenarda one eklenir; asagisi
 * oldugu gibi sunulur.
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
    // Site haritasi YOK: noindex bir sayfayi haritada tutmak Google'a celiskili
    // sinyal verir (SEO manifestosu §3).
  };
}
