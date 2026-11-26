import { useState } from "react";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import { formatCount } from "../../utils/formatters";
import { Download, HardDrive, Upload } from "lucide-react";

const BACKUP_HISTORY = [
  { date: "2026-06-01", time: "10:30 AM", size: "25 MB" },
  { date: "2026-06-02", time: "11:15 AM", size: "28 MB" },
  { date: "2026-06-03", time: "09:45 AM", size: "30 MB" },
  { date: "2026-06-04", time: "04:20 PM", size: "32 MB" },
  { date: "2026-06-05", time: "06:10 PM", size: "35 MB" },
];

/**
 * Database backup & recovery console.
 */
function BackupRestore() {
  const [notice, setNotice] = useState("");

  return (
    <div className="max-w-4xl space-y-5 text-foreground">
      <CommonPageHeader
        title="Backup & Restore"
        subtitle="Manage encrypted PostgreSQL snapshots and archival recovery archives"
      />

      <ValidationMessage
        type="info"
        message={notice}
        onDismiss={() => setNotice("")}
        className="mt-0!"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card text-foreground p-5 rounded-lg border border-border surface-shadow flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-primary-text" />
              <h2 className="text-sm font-semibold text-foreground">Create Database Snapshot</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Trigger an on-demand point-in-time archive of all tenant tables and ledger journals.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Database snapshots are orchestrated by your PostgreSQL host backup scheduler."
                )
              }
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium cursor-pointer transition-colors"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Create Backup</span>
            </button>
          </div>
        </div>

        <div className="bg-card text-foreground p-5 rounded-lg border border-border surface-shadow flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-4 h-4 text-primary-text" />
              <h2 className="text-sm font-semibold text-foreground">Restore from Archive</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Select a verified PostgreSQL dump file to restore tenant records.
            </p>
            <input
              type="file"
              className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:text-xs file:font-medium file:bg-secondary file:text-foreground hover:file:bg-secondary/80 border border-input rounded-md p-1.5 bg-card"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={() =>
                setNotice(
                  "Archive restore requires administrative host CLI access for tenant isolation safety."
                )
              }
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-secondary border border-border text-secondary-foreground hover:bg-secondary/80 text-xs font-medium cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restore Backup</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backup History */}
      <div className="bg-card text-foreground rounded-lg border border-border surface-shadow overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent Snapshots</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatCount(BACKUP_HISTORY.length, "archive")}
          </span>
        </div>

        <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Time</th>
                <th className="px-4 py-2.5">Archive Size</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {BACKUP_HISTORY.map((backup, index) => (
                <tr key={index} className="elevated-table-row transition-colors">
                  <td className="px-4 py-2.5 text-xs font-mono text-foreground tabular-nums">
                    {backup.date}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                    {backup.time}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono text-foreground tabular-nums">
                    {backup.size}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setNotice(`Snapshot ${backup.date} download requires host storage linkage.`)
                      }
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-background hover:bg-secondary text-xs font-medium text-primary-text cursor-pointer transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>
      </div>
    </div>
  );
}

export default BackupRestore;
