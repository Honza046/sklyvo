/** Centered indeterminate “caterpillar” loader for auth primary buttons. */
export function AuthButtonLoader({ label = "Načítání" }: { label?: string }) {
  return (
    <span className="sklyvo-btn-loader" role="status" aria-label={label}>
      <span className="sklyvo-btn-loader__track" aria-hidden>
        <span className="sklyvo-btn-loader__bar" />
      </span>
    </span>
  );
}
