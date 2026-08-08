import { requireSessionUserId } from "@/lib/require-session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSessionUserId();
  return children;
}
