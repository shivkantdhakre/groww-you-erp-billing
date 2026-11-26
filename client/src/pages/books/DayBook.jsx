import { useState, useEffect, useCallback } from "react";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import CommonFilter from "../../components/common/CommonFilter";
import CommonCard from "../../components/common/CommonCard";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import StatusBadge from "../../components/common/StatusBadge";
import api from "../../utils/api";
import { formatINR } from "../../utils/formatters";
import { CalendarDays, Loader2, Printer, RotateCcw, Search } from "lucide-react";

const INPUT_CLASS = "erp-input";
const LABEL_CLASS = "erp-label";

/**
 * Chronological daily voucher & invoice book displaying Dr / Cr postings.
 */
function DayBook() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDayBook = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/reports/day-book?fromDate=${date}&toDate=${date}`);
      setEntries(res.data || []);
    } catch (err) {
      console.error("Failed to load day book:", err);
      setError("Failed to load day book records. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDayBook();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDayBook]);

  const totalEntries = entries.length;
  const totalDebit = entries
    .filter((item) => !item.isCancelled)
    .reduce((total, item) => total + item.debit, 0);
  const totalCredit = entries
    .filter((item) => !item.isCancelled)
    .reduce((total, item) => total + item.credit, 0);

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Day Book"
        subtitle="Chronological register of daily vouchers, invoices, and credit adjustments"
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-card hover:bg-secondary/70 text-xs font-medium text-foreground cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Book</span>
          </button>
        }
      />

      <ValidationMessage
        type="error"
        message={error}
        onDismiss={() => setError("")}
        className="mt-0!"
      />

      <CommonFilter className="no-print mb-0!">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className={LABEL_CLASS}>Posting Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <button
            type="button"
            onClick={loadDayBook}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Load Day Book</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];
              setDate(today);
              setTimeout(() => {
                loadDayBook();
              }, 80);
            }}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-secondary-foreground text-xs sm:text-sm font-medium cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Today</span>
          </button>
        </div>
      </CommonFilter>

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary-text" />
          <span>Loading daily transactions&hellip;</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CommonCard title="Total Entries" value={String(totalEntries)} icon={CalendarDays} />
            <CommonCard
              title="Total Debit (Dr)"
              value={formatINR(totalDebit)}
              color="text-destructive"
            />
            <CommonCard
              title="Total Credit (Cr)"
              value={formatINR(totalCredit)}
              color="text-success"
            />
          </div>

          <TableWrapper>
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Voucher / Ref No</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Particulars</th>
                  <th className="px-4 py-2.5 text-right">Debit (Dr)</th>
                  <th className="px-4 py-2.5 text-right">Credit (Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {entries.map((item, index) => (
                  <tr
                    key={index}
                    className={`elevated-table-row transition-colors ${
                      item.isCancelled ? "opacity-60 bg-destructive/5" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                      {item.voucherNo}
                    </td>
                    <td className="px-4 py-2.5 text-foreground font-medium">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{item.type}</span>
                        {item.isCancelled && <StatusBadge variant="destructive">Voided</StatusBadge>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{item.particulars}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-destructive tabular-nums whitespace-nowrap">
                      {item.debit > 0 ? formatINR(item.debit) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-success tabular-nums whitespace-nowrap">
                      {item.credit > 0 ? formatINR(item.credit) : "-"}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No transactions recorded on this day.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableWrapper>
        </>
      )}
    </div>
  );
}

export default DayBook;
