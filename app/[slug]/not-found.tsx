import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-zinc-50">
      <div className="max-w-md w-full text-center">
        <div className="text-7xl mb-6">🔍</div>
        <h1 className="text-3xl font-bold text-zinc-900 mb-3">
          Firma bulunamadı
        </h1>
        <p className="text-zinc-600 mb-8 leading-relaxed">
          Aradığınız firma profil sayfası mevcut değil. URL doğru yazılmış
          olabilir mi? ProTakip&apos;e kayıtlı olmayan firmalar burada
          listelenmez.
        </p>
        <Link
          href="https://protakip.com"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 text-white font-semibold hover:bg-zinc-800 transition-colors"
        >
          ProTakip ana sayfasına git
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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
    </main>
  );
}
