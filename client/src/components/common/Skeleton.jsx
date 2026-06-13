function Skeleton({ type = "card" }) {

  if (type === "card") {
    return (
      <div className="bg-card border border-border p-5 rounded-xl shadow-sm animate-pulse">
        <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
        <div className="h-10 bg-muted/60 rounded"></div>
      </div>
    );
  }

  if (type === "form") {
    return (
      <div className="bg-card border border-border p-5 rounded-xl shadow-sm animate-pulse">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="h-12 bg-muted/60 rounded"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="bg-card border border-border p-5 rounded-xl shadow-sm animate-pulse">
        {[...Array(5)].map((_, index) => (
          <div
            key={index}
            className="h-12 bg-muted/60 rounded mb-3"
          ></div>
        ))}
      </div>
    );
  }

  if (type === "dashboard") {
    return (
      <div className="grid grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="bg-card border border-border p-6 rounded-xl shadow-sm"
          >
            <div className="h-6 bg-muted rounded mb-3"></div>
            <div className="h-10 bg-muted/60 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export default Skeleton;