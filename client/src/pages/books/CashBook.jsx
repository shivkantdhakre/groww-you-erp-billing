import { useState, useEffect, useCallback } from "react";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import CommonFilter from "../../components/common/CommonFilter";
import CommonCard from "../../components/common/CommonCard";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import StatusBadge from "../../components/common/StatusBadge";
import api from "../../utils/api";
import { formatINR } from "../../utils/formatters";
import { Banknote, Loader2, Printer, RotateCcw, Search } from "lucide-react";

const INPUT_CLASS = "erp-input";
const LABEL_CLASS = "erp-label";

/**
 * Cash book ledger tracking physical counter receipts, payouts, and closing cash.
 */
function CashBook() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [cashEntries, setCashEntries] = useState([]);
  const [openingCash, setOpeningCash] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCashBook = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/reports/cash-book?fromDate=${fromDate}&toDate=${toDate}`);
      setOpeningCash(res.data.openingCash || 0);
      setCashEntries(res.data.cashEntries || []);
    } catch (err) {
      console.error("Failed to load cash book:", err);
      setError("Failed to load cash book data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCashBook();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadCashBook]);

  const totalReceipt = cashEntries.reduce((total, item) => total + item.receipt, 0);
  const totalPayment = cashEntries.reduce((total, item) => total + item.payment, 0);
  const closingCash = openingCash + totalReceipt - totalPayment;

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Cash Book"
        subtitle="Track daily cash drawer inflows, expenses, and closing cash balance"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className={LABEL_CLASS}>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <button
            type="button"
            onClick={loadCashBook}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Apply Filter</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setTimeout(() => {
                loadCashBook();
              }, 80);
            }}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-secondary-foreground text-xs sm:text-sm font-medium cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </CommonFilter>

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary-text" />
          <span>Loading cash book records&hellip;</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <CommonCard
              title="Opening Cash"
              value={formatINR(openingCash)}
              color="text-foreground"
              icon={Banknote}
            />
            <CommonCard
              title="Total Receipts (Dr)"
              value={formatINR(totalReceipt)}
              color="text-success"
            />
            <CommonCard
              title="Total Payments (Cr)"
              value={formatINR(totalPayment)}
              color="text-destructive"
            />
            <CommonCard
              title="Closing Cash"
              value={formatINR(closingCash)}
              color="text-primary-text"
            />
          </div>

          <TableWrapper>
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Voucher No</th>
                  <th className="px-4 py-2.5">Particulars</th>
                  <th className="px-4 py-2.5 text-right">Receipt (Dr)</th>
                  <th className="px-4 py-2.5 text-right">Payment (Cr)</th>
                  <th className="px-4 py-2.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {cashEntries.map((item, index) => (
                  <tr key={index} className="elevated-table-row transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                      {item.voucherNo}
                    </td>
                    <td className="px-4 py-2.5 text-foreground font-medium">{item.particulars}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-success tabular-nums whitespace-nowrap">
                      {item.receipt > 0 ? (
                        <span>{formatINR(item.receipt)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-destructive tabular-nums whitespace-nowrap">
                      {item.payment > 0 ? (
                        <span>{formatINR(item.payment)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-foreground tabular-nums whitespace-nowrap">
                      {formatINR(item.balance)}{" "}
                      <StatusBadge variant={item.balance >= 0 ? "success" : "destructive"} className="ml-1">
                        {item.balance >= 0 ? "Dr" : "Cr"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
                {cashEntries.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No cash transactions found for this period.
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

export default CashBook;
