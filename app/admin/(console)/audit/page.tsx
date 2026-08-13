import { listAdminAuditLogs } from "@/app/actions/platform-admin";
import { AdminPageHead } from "@/components/admin/admin-page-head";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const logs = await listAdminAuditLogs(30);

  return (
    <div className="sk-admin__page sk-admin__page--list">
      <AdminPageHead title="Audit" meta={`${logs.length} akcí`} />

      <div className="sk-admin__table-wrap sk-admin__table-wrap--scroll">
        <table className="sk-admin__table sk-admin__table--dense">
          <thead>
            <tr>
              <th>Čas</th>
              <th>Actor</th>
              <th>Akce</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="sk-admin__muted text-xs whitespace-nowrap">
                  {log.createdAt.toLocaleString("cs-CZ", {
                    day: "numeric",
                    month: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="text-xs">{log.actorEmail}</td>
                <td className="font-medium text-xs">{log.action}</td>
                <td className="font-mono text-xs">
                  {log.targetType}:{log.targetId.slice(0, 8)}…
                </td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="sk-admin__empty">
                  Zatím nic.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
