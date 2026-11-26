import { useState, useEffect, useCallback } from "react";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import CommonFilter from "../../components/common/CommonFilter";
import CommonCard from "../../components/common/CommonCard";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import StatusBadge from "../../components/common/StatusBadge";
import api from "../../utils/api";
import { BookMarked, Loader2, Printer, RotateCcw, Search } from "lucide-react";

const INPUT_CLASS =
  "h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors";
const LABEL_CLASS =
  "block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

/**
 * Party account statement for customers tracking invoices, receipts, returns, and closing balance.
 */
function CustomerLedger() {
  const customers = useStore((state) => state.customers);
  const fetchCustomers = useStore((state) => state.fetchCustomers);

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLedger = useCallback(async () => {
    if (!selectedCustomer) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(
        `/reports/ledger?customerId=${selectedCustomer}&fromDate=${fromDate}&toDate=${toDate}`
      );
      setLedgerData(res.data);
    } catch (err) {
      console.error("Failed to load customer ledger:", err);
      setError("Failed to load customer ledger statement.");
    } finally {
      setLoading(false);
    }
  }, [selectedCustomer, fromDate, toDate]);

  useEffect(() => {
    fetchCustomers().catch((err) => console.error("Failed to fetch customers:", err));
  }, [fetchCustomers]);

  useEffect(() => {
    if (selectedCustomer) {
      const timer = setTimeout(() => {
        loadLedger();
      }, 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setLedgerData(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedCustomer, loadLedger]);

  const totalDebit =
    ledgerData?.transactions
      .filter((tx) => !tx.isCancelled)
      .reduce((total, tx) => total + tx.debit, 0) || 0;

  const totalCredit =
    ledgerData?.transactions
      .filter((tx) => !tx.isCancelled)
      .reduce((total, tx) => total + tx.credit, 0) || 0;

  const outstandingBalance = (ledgerData?.openingBalance || 0) + totalDebit - totalCredit;

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Customer Ledger"
        subtitle="Inspect party-level debits, receipt credits, and running receivable balances"
        actions={
          ledgerData && (
            <button
              type="button"
              onClick={() => window.print()}
              className="no-print inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-card hover:bg-secondary/70 text-xs font-medium text-foreground cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
          )
        }
      />

      <ValidationMessage
        type="error"
        message={error}
        onDismiss={() => setError("")}
        className="mt-0!"
      />

      <CommonFilter className="no-print mb-0!">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className={LABEL_CLASS}>Customer Account</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              <option value="">Select Customer</option>
              {customers
                .filter((c) => c.isActive)
                .map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
            </select>
          </div>

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
            onClick={loadLedger}
            disabled={!selectedCustomer}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Load Statement</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedCustomer("");
              setFromDate("");
              setToDate("");
              setSearchTerm("");
              setLedgerData(null);
            }}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-secondary-foreground text-xs sm:text-sm font-medium cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </CommonFilter>

      {!selectedCustomer && (
        <div className="bg-card border border-border rounded-lg py-10 px-6 text-center text-xs text-muted-foreground surface-shadow">
          Select a customer account above to inspect their ledger statement.
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10 gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary-text" />
          <span>Loading ledger statement...</span>
        </div>
      )}

      {ledgerData && !loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <CommonCard
              title="Opening Balance"
              value={`₹ ${ledgerData.openingBalance.toFixed(2)}`}
              icon={BookMarked}
            />
            <CommonCard
              title="Total Billed (Dr)"
              value={`₹ ${totalDebit.toFixed(2)}`}
              color="text-foreground"
            />
            <CommonCard
              title="Receipts & Credits (Cr)"
              value={`₹ ${totalCredit.toFixed(2)}`}
              color="text-success"
            />
            <CommonCard
              title="Outstanding Balance"
              value={`₹ ${outstandingBalance.toFixed(2)}`}
              color={outstandingBalance > 0 ? "text-warning" : "text-success"}
            />
          </div>

          <div className="bg-card rounded-lg border border-border surface-shadow overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">Ledger Statement</h2>
              <div className="relative w-full sm:w-64 no-print">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-9 pr-3 rounded-md bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full"
                />
              </div>
            </div>

            <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Reference / Particulars</th>
                    <th className="px-4 py-2.5">Voucher Type</th>
                    <th className="px-4 py-2.5 text-right">Debit (Dr)</th>
                    <th className="px-4 py-2.5 text-right">Credit (Cr)</th>
                    <th className="px-4 py-2.5 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  <tr className="bg-secondary/35 font-medium text-xs">
                    <td className="px-4 py-2.5 text-foreground" colSpan="3">
                      Opening Balance Brought Forward
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground tabular-nums">
                      -
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground tabular-nums">
                      -
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground tabular-nums">
                      ₹ {ledgerData.openingBalance.toFixed(2)}
                    </td>
                  </tr>
                  {ledgerData.transactions
                    .filter((tx) =>
                      tx.reference.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((tx, index) => (
                      <tr
                        key={index}
                        className={`elevated-table-row transition-colors ${
                          tx.isCancelled ? "opacity-60 bg-destructive/5" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                          {tx.date}
                        </td>
                        <td className="px-4 py-2.5 text-foreground font-medium">{tx.reference}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{tx.type}</span>
                            {tx.isCancelled && <StatusBadge variant="destructive">Voided</StatusBadge>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-foreground tabular-nums">
                          {tx.debit > 0 ? `₹ ${tx.debit.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-success tabular-nums">
                          {tx.credit > 0 ? `₹ ${tx.credit.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-foreground tabular-nums">
                          ₹ {tx.balance.toFixed(2)}{" "}
                          <StatusBadge variant={tx.balance >= 0 ? "warning" : "success"} className="ml-1">
                            {tx.balance >= 0 ? "Dr" : "Cr"}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  {ledgerData.transactions.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-xs text-muted-foreground">
                        No transactions recorded for this customer in the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrapper>
          </div>
        </>
      )}
    </div>
  );
}

export default CustomerLedger;
