/**
 * Compact KPI and summary surface card with tabular numerals.
 */
function CommonCard({ title, value, color = "text-foreground", subtitle, icon: Icon, className = "" }) {
  return (
    <div
      className={`bg-card text-card-foreground border border-border rounded-lg p-4 sm:p-5 surface-shadow transition-colors ${className}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
            {title}
          </p>
          <p className={`text-lg sm:text-xl xl:text-[22px] font-semibold font-mono tracking-tight tabular-nums whitespace-nowrap mt-1.5 ${color}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1 leading-snug">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="h-8 w-8 rounded-md bg-secondary/75 border border-border/70 flex items-center justify-center text-muted-foreground shrink-0">
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}

export default CommonCard;
