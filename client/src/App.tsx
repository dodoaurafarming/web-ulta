export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-sky-100 p-6">
      <section className="max-w-lg w-full rounded-3xl bg-white/90 p-8 shadow-xl border-2 border-amber-200 text-center space-y-4">
        <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
          ULTA / 1.0 — Tahap 1 Siap
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900">
          Ular Tangga Multiplayer
        </h1>
        <p className="text-sm text-slate-600">
          Struktur frontend React + Vite + TypeScript + Tailwind CSS sudah aktif.
          Layer WebSocket (ULTA/1.0) dan halaman game akan dibangun pada tahap berikutnya.
        </p>
      </section>
    </main>
  );
}
