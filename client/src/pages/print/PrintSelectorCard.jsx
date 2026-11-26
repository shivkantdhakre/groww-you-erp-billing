import { ArrowLeft, Search, ChevronLeft, ChevronRight, FileText } from "lucide-react";

/**
 * Shared Atelier-Ledger selector card rendered when an A4 print route is opened
 * without an explicit record ID, preventing silent printing of an arbitrary record.
 */
export default function PrintSelectorCard({
  backRoute,
  backLabel,
  companyName,
  selectorTag,
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  error,
  items,
  totalFetchedCount,
  emptyBranchMessage,
  emptyFilterMessage,
  emptyActionLabel,
  onNavigate,
  columns,
  renderRowCells,
  getOpenRoute,
  getRowClassName,
  pagination,
  page,
  onPageChange,
  pageContainerStyle,
}) {
  return (
    <div style={pageContainerStyle}>
      <div className="max-w-3xl mx-auto space-y-4 text-[#1C1F1C]">
        <div className="bg-white border border-[#D8D3C8] rounded-lg px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onNavigate(backRoute)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C5F58] hover:text-[#1C1F1C] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{backLabel}</span>
          </button>
          <span className="text-xs text-[#5C5F58]">
            {companyName || "Groww You ERP"} · {selectorTag}
          </span>
        </div>

        <div className="bg-white border border-[#D8D3C8] rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#D8D3C8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold text-[#1C1F1C]">{title}</h1>
              <p className="text-xs text-[#5C5F58] mt-0.5">{subtitle}</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#5C5F58] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-8 pr-3 rounded-md border border-[#D8D3C8] bg-[#FAF9F5] text-xs text-[#1C1F1C] placeholder:text-[#7A7D75] focus:outline-none focus:border-[#2D5A47]"
              />
            </div>
          </div>

          {error ? (
            <div className="p-6 text-center text-sm text-[#B63A32]">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-[#5C5F58]">
                {totalFetchedCount === 0 ? emptyBranchMessage : emptyFilterMessage}
              </p>
              <button
                type="button"
                onClick={() => onNavigate(backRoute)}
                className="px-4 py-2 rounded-md bg-[#2D5A47] text-white text-xs font-medium cursor-pointer"
              >
                {emptyActionLabel}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#F5F3EE] border-b border-[#D8D3C8] text-[11px] uppercase tracking-wider text-[#5C5F58]">
                  <tr>
                    {columns.map((col) => (
                      <th key={col.label} className={`px-4 py-2.5 ${col.align === "right" ? "text-right" : ""}`}>
                        {col.label}
                      </th>
                    ))}
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE4]">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={getRowClassName ? getRowClassName(item) : "hover:bg-[#FAF9F5]"}
                    >
                      {renderRowCells(item)}
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigate(getOpenRoute(item))}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-[#2D5A47] hover:bg-[#24493A] text-white text-xs font-medium cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Open A4</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-[#D8D3C8] bg-[#FAF9F5] flex items-center justify-between text-xs text-[#5C5F58]">
              <span className="tabular-nums">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded border border-[#D8D3C8] bg-white text-[#1C1F1C] disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded border border-[#D8D3C8] bg-white text-[#1C1F1C] disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
