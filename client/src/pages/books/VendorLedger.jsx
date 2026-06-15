import { useState, useEffect, useCallback } from "react";
import { useStore } from "../../store/useStore";
import TableWrapper from "../../components/common/TableWrapper";
import api from "../../utils/api";

function VendorLedger() {
  const vendors = useStore((state) => state.vendors);
  const fetchVendors = useStore((state) => state.fetchVendors);

  const [selectedVendor, setSelectedVendor] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadLedger = useCallback(async () => {
    if (!selectedVendor) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/reports/ledger?vendorId=${selectedVendor}&fromDate=${fromDate}&toDate=${toDate}`
      );
      setLedgerData(res.data);
    } catch (err) {
      console.error("Failed to load vendor ledger:", err);
      alert("Failed to load ledger data");
    } finally {
      setLoading(false);
    }
  }, [selectedVendor, fromDate, toDate]);

  useEffect(() => {
    fetchVendors().catch((err) => console.error("Failed to fetch vendors:", err));
  }, [fetchVendors]);

  useEffect(() => {
    if (selectedVendor) {
      // Defer to prevent calling setState synchronously within the effect body
      const timer = setTimeout(() => {
        loadLedger();
      }, 0);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setLedgerData(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedVendor, loadLedger]);

  const totalDebit =
    ledgerData?.transactions
      .filter((tx) => !tx.isCancelled)
      .reduce((total, tx) => total + tx.debit, 0) || 0;

  const totalCredit =
    ledgerData?.transactions
      .filter((tx) => !tx.isCancelled)
      .reduce((total, tx) => total + tx.credit, 0) || 0;

  const outstandingBalance = (ledgerData?.openingBalance || 0) + totalCredit - totalDebit;

  return (
    <div className="space-y-6 text-foreground">
      <h1 className="text-3xl font-bold text-foreground">
        Vendor Ledger
      </h1>

      <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Vendor</label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer w-full"
            >
              <option value="">Select Vendor</option>
              {vendors.filter(v => v.isActive).map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={loadLedger}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-lg w-full cursor-pointer transition shadow-sm"
            >
              Search
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedVendor("");
                setFromDate("");
                setToDate("");
                setSearchTerm("");
                setLedgerData(null);
              }}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold py-3 px-6 rounded-lg w-full cursor-pointer transition"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center mt-6 text-muted-foreground font-semibold flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading ledger records...</span>
        </div>
      )}

      {ledgerData && !loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Opening Balance</p>
              <p className="text-2xl font-bold text-primary mt-1">
                ₹ {ledgerData.openingBalance.toFixed(2)}
              </p>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Purchase (Cr)</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">
                ₹ {totalCredit.toFixed(2)}
              </p>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Paid/Returned (Dr)</p>
              <p className="text-2xl font-bold text-orange-500 dark:text-orange-400 mt-1">
                ₹ {totalDebit.toFixed(2)}
              </p>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Outstanding Balance</p>
              <p className="text-2xl font-bold text-destructive mt-1">
                ₹ {outstandingBalance.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm mt-6 overflow-hidden">
            <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-foreground">
                Ledger Transactions
              </h2>

              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Search Reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border border-border p-2.5 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full md:w-64"
                />

                <button
                  onClick={() => window.print()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-lg cursor-pointer transition shadow-sm text-sm no-print"
                >
                  Print Ledger
                </button>
              </div>
            </div>

            <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-4 text-left font-semibold">Date</th>
                    <th className="p-4 text-left font-semibold">Reference / Details</th>
                    <th className="p-4 text-left font-semibold">Voucher Type</th>
                    <th className="p-4 text-right font-semibold">Debit (Dr)</th>
                    <th className="p-4 text-right font-semibold">Credit (Cr)</th>
                    <th className="p-4 text-right font-semibold">Running Balance</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  <tr className="bg-secondary/20 font-semibold">
                    <td className="p-4 text-left text-foreground" colSpan="3">Opening Balance Forward</td>
                    <td className="p-4 text-right font-mono text-muted-foreground">₹ 0.00</td>
                    <td className="p-4 text-right font-mono text-muted-foreground">₹ 0.00</td>
                    <td className="p-4 text-right font-mono text-primary">₹ {ledgerData.openingBalance.toFixed(2)}</td>
                  </tr>
                  {ledgerData.transactions
                    .filter((tx) =>
                      tx.reference
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                    )
                    .map((tx, index) => (
                      <tr key={index} className={`hover:bg-secondary/20 transition-colors duration-150 ${tx.isCancelled ? "bg-destructive/10 text-muted-foreground line-through" : ""}`}>
                        <td className="p-4 text-muted-foreground">{tx.date}</td>
                        <td className="p-4 text-left text-foreground font-medium">{tx.reference}</td>
                        <td className="p-4 text-foreground">
                          {tx.type}
                          {tx.isCancelled && <span className="text-destructive text-xs font-bold ml-1.5">(Voided)</span>}
                        </td>
                        <td className="p-4 text-right font-mono text-orange-500 dark:text-orange-400">₹ {tx.debit.toFixed(2)}</td>
                        <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-500">₹ {tx.credit.toFixed(2)}</td>
                        <td className="p-4 text-right font-mono font-bold text-primary">₹ {tx.balance.toFixed(2)}</td>
                      </tr>
                    ))}
                  {ledgerData.transactions.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-muted-foreground font-medium">
                        No transactions recorded for this vendor in the selected period.
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

export default VendorLedger;