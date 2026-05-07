import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://firma.protakip.com"),
  title: {
    default: "ProTakip Firma Rehberi",
    template: "%s | ProTakip",
  },
  description:
    "Halı yıkama, oto yıkama, klima servisi ve tüm hizmet sektöründeki firmaların ProTakip ile yönetilen profilleri. Adres, telefon, çalışma saatleri ve doğrudan WhatsApp iletişimi.",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "ProTakip",
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
