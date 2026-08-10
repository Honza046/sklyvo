/** Root /admin — no auth gate (forbidden page lives here). */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
