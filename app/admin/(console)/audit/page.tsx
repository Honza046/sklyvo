import { listAdminAuditLogs } from "@/app/actions/platform-admin";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const logs = await listAdminAuditLogs(100);

  return (
    <div className="sk-admin__page">
      <header className="sk-admin__page-head">
        <h1 className="sk-admin__h1">Audit</h1>
        <p className="sk-admin__lede">Posledních {logs.length} admin akcí</p>
      </header>

      <div className="sk-admin__table-wrap">
        <table className="sk-admin__table">
          <thead>
            <tr>
              <th>Čas</th>
              <th>Actor</th>
              <th>Akce</th>
              <th>Target</th>
              <th>Meta</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="sk-admin__muted text-xs whitespace-nowrap">
                  {log.createdAt.toLocaleString("cs-CZ")}
                </td>
                <td className="text-xs">{log.actorEmail}</td>
                <td className="font-medium text-xs">{log.action}</td>
                <td className="font-mono text-xs">
                  {log.targetType}:{log.targetId.slice(0, 10)}…
                </td>
                <td className="sk-admin__muted max-w-xs truncate text-xs">
                  {log.metaJson || "—"}
                </td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="sk-admin__empty">
                  Zatím žádné záznamy.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
