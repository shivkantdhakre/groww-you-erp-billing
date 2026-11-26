/**
 * Bordered responsive table wrapper consuming optional loading/count metadata cleanly.
 */
export default function TableWrapper({ children, className = "", loading = false, totalItems }) {
  return (
    <div
      data-loading={loading ? "true" : undefined}
      data-total-items={totalItems}
      className={`bg-card text-foreground rounded-lg border border-border surface-shadow overflow-x-auto w-full scrollbar-thin ${className}`}
    >
      {children}
    </div>
  );
}
