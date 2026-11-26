/**
 * Reusable bordered table container with muted typographic header.
 */
function CommonTable({
  headers = [],
  children,
  className = "",
}) {
  return (
    <div
      className={`bg-card text-foreground border border-border rounded-lg surface-shadow overflow-x-auto scrollbar-thin ${className}`}
    >
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-secondary/70 border-b border-border">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">{children}</tbody>
      </table>
    </div>
  );
}

export default CommonTable;
