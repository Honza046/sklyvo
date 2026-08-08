/** Three bouncing dots — chat “typing…” effect for auth buttons. */
export function AuthButtonLoader({ label = "Načítání" }: { label?: string }) {
  return (
    <span className="sklyvo-btn-loader" role="status" aria-label={label}>
      <span className="sklyvo-btn-loader__dot" aria-hidden />
      <span className="sklyvo-btn-loader__dot" aria-hidden />
      <span className="sklyvo-btn-loader__dot" aria-hidden />
    </span>
  );
}
