import { notFound } from "next/navigation";
import { getAdminWorkspace } from "@/app/actions/platform-admin";
import { AdminPageHead } from "@/components/admin/admin-page-head";
import { AdminWorkspaceTabs } from "@/components/admin/admin-workspace-tabs";

export const dynamic = "force-dynamic";

export default async function AdminWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ws = await getAdminWorkspace(id);
  if (!ws) notFound();

  return (
    <div className="sk-admin__page sk-admin__page--detail">
      <AdminPageHead
        title={ws.name}
        backHref="/admin/workspaces"
        backLabel="Workspaces"
        meta={[ws.companyName, ws.industry].filter(Boolean).join(" · ") || undefined}
      />
      <AdminWorkspaceTabs workspace={ws} />
    </div>
  );
}
