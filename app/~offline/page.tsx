export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#08090a] px-6 text-center">
      <span
        className="h-2 w-2 rounded-full bg-[#02A7FF]"
        aria-hidden
      />
      <h1 className="sk-type-h1 text-[#FAFAFB]">Sklyvo</h1>
      <p className="max-w-sm text-sm leading-relaxed text-[#8A8F98]">
        Jste offline. Připojte se k internetu a načtěte aplikaci znovu.
      </p>
    </main>
  );
}
