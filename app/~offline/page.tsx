export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <div className="h-3 w-3 rounded-full bg-blue-600" />
      <h1 className="text-xl font-semibold tracking-tight">Sklyvo</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Jste offline. Připojte se k internetu a načtěte aplikaci znovu.
      </p>
    </main>
  );
}
