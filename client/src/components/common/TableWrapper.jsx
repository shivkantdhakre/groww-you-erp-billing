export default function TableWrapper({ children, className = "" }) {
  return (
    <div className={`bg-card text-foreground rounded-xl border border-border shadow-sm overflow-x-auto w-full scrollbar-thin ${className}`}>
      {children}
    </div>
  );
}
