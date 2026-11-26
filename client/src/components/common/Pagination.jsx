import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Compact numbered pagination bar with bounded ellipsis window.
 */
function Pagination({ currentPage = 1, totalPages = 1, onPageChange, className = "" }) {
  if (!totalPages || totalPages <= 1) return null;

  const getPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    if (start > 2) pages.push("...");
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className={`flex flex-wrap justify-center sm:justify-end items-center gap-1.5 mt-4 ${className}`}>
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary/70 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Prev</span>
      </button>

      {getPages().map((page, index) =>
        page === "..." ? (
          <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-muted-foreground select-none">
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`h-8 min-w-8 px-2 rounded-md border text-xs font-medium tabular-nums transition-colors cursor-pointer ${
              currentPage === page
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-secondary/70"
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-secondary/70 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        <span>Next</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default Pagination;
