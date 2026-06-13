function BackupRestore() {
  const backupHistory = [
    {
      date: "2026-06-01",
      time: "10:30 AM",
      size: "25 MB",
    },
    {
      date: "2026-06-02",
      time: "11:15 AM",
      size: "28 MB",
    },
    {
      date: "2026-06-03",
      time: "09:45 AM",
      size: "30 MB",
    },
    {
      date: "2026-06-04",
      time: "04:20 PM",
      size: "32 MB",
    },
    {
      date: "2026-06-05",
      time: "06:10 PM",
      size: "35 MB",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 text-foreground">
        Backup & Restore
      </h1>

      <p className="text-muted-foreground mb-6">
        Manage Database Backup & Recovery
      </p>

      {/* Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        <div className="bg-card text-foreground p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Backup Database
          </h2>

          <p className="text-muted-foreground mb-4">
            Create a database backup file.
          </p>

          <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2 rounded-lg font-semibold transition cursor-pointer shadow-sm">
            Create Backup
          </button>
        </div>

        <div className="bg-card text-foreground p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Restore Database
          </h2>

          <p className="text-muted-foreground mb-4">
            Upload backup file and restore.
          </p>

          <input
            type="file"
            className="bg-card text-foreground border border-border p-2 rounded-lg w-full mb-4 focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-semibold transition cursor-pointer shadow-sm">
            Restore Backup
          </button>
        </div>

      </div>

      {/* Backup History */}

      <div className="bg-card text-foreground p-6 rounded-xl border border-border shadow-sm">

        <h2 className="text-xl font-semibold mb-4 text-foreground">
          Backup History
        </h2>

        <table className="w-full">

          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Time</th>
              <th className="p-3 text-left">Backup Size</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>

            {backupHistory.map((backup, index) => (
              <tr key={index} className="border-t border-border hover:bg-muted/30 transition">

                <td className="p-3">{backup.date}</td>
                <td className="p-3">{backup.time}</td>
                <td className="p-3">{backup.size}</td>

                <td className="p-3">

                  <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded text-sm transition cursor-pointer shadow-sm">
                    Download
                  </button>

                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default BackupRestore;