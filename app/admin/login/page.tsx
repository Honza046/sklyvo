import { redirect } from "next/navigation";
import { AdminLoginScreen } from "@/components/admin/admin-login-screen";
import { getAdminLoginState } from "@/app/actions/platform-admin";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const { alreadyAdmin } = await getAdminLoginState();
  if (alreadyAdmin) {
    redirect("/admin");
  }

  return <AdminLoginScreen />;
}
