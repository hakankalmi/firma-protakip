import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    // Pages set "{Firma adı} – {İlçe}, {Şehir}"; the brand is appended exactly once here.
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Halı yıkama, oto yıkama, klima servisi ve tüm hizmet sektöründeki firmaların ProTakip ile yönetilen profilleri. Adres, telefon, çalışma saatleri ve doğrudan WhatsApp iletişimi.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: SITE_NAME,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={inter.variable}>
      <body className="bg-zinc-50 text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
