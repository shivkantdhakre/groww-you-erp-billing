/**
 * Responsive loading skeleton matching card, form, table, and dashboard layouts.
 */
function Skeleton({ type = "card" }) {
  if (type === "card") {
    return (
      <div className="bg-card border border-border p-5 rounded-lg surface-shadow animate-pulse">
        <div className="h-3.5 bg-muted rounded w-1/3 mb-3" />
        <div className="h-7 bg-muted/70 rounded w-2/3" />
      </div>
    );
  }

  if (type === "form") {
    return (
      <div className="bg-card border border-border p-5 rounded-lg surface-shadow animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="h-10 bg-muted/60 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="bg-card border border-border p-4 rounded-lg surface-shadow animate-pulse space-y-2.5">
        <div className="h-8 bg-muted rounded-md mb-3" />
        {[...Array(5)].map((_, index) => (
          <div key={index} className="h-10 bg-muted/55 rounded-md" />
        ))}
      </div>
    );
  }

  if (type === "dashboard") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-card border border-border p-5 rounded-lg surface-shadow">
            <div className="h-3.5 bg-muted rounded w-1/2 mb-3" />
            <div className="h-8 bg-muted/70 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export default Skeleton;
