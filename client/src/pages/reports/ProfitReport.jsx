import { useState, useEffect, useMemo, useCallback } from "react";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";

function ProfitReport() {
  const customers = useStore((state) => state.customers);
  const fetchCustomers = useStore((state) => state.fetchCustomers);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [customerId, setCustomerId] = useState("");

  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadProfitReport = useCallback(async () => {
    setLoading(true);
    try {
      // We query the sales report endpoint which returns full invoices with items and customers
      const res = await api.get(
        `/reports/sales?customerId=${customerId}&fromDate=${fromDate}&toDate=${toDate}`
      );
      setSalesData(res.data || []);
      setError("");
    } catch (err) {
      console.error("Failed to load profit report:", err);
      setError("Failed to load profitability data from the database.");
    } finally {
      setLoading(false);
    }
  }, [customerId, fromDate, toDate]);

  useEffect(() => {
    fetchCustomers().catch((err) => console.error("Error loading customers:", err));
    const timer = setTimeout(() => {
      loadProfitReport();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCustomers, loadProfitReport]);

  // Perform dynamic cost & profitability calculations based on database snapshot costs
  const { invoiceProfitability, totalRevenue, totalCost, totalProfit } = useMemo(() => {
    const data = salesData.map((invoice) => {
      let invRevenue = 0;
      let invCost = 0;

      invoice.items.forEach((line) => {
        const lineQty = line.qty;
        const lineSellPrice = line.price; // Base selling price (before GST)
        const lineCostPrice = line.purchasePrice || 0.0; // Snapshot cost rate

        invRevenue += lineSellPrice * lineQty;
        invCost += lineCostPrice * lineQty;
      });

      const invProfit = invRevenue - invCost;
      const invMargin = invRevenue > 0 ? (invProfit / invRevenue) * 100 : 0;

      return {
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        invoiceDate: invoice.invoiceDate,
        customerName: invoice.customer?.name || "Walk-in Customer",
        totalQty: invoice.totalQty,
        grandTotal: invoice.grandTotal, // Inclusive of GST
        revenue: invRevenue, // Pre-tax sales
        cost: invCost, // Pre-tax cost
        profit: invProfit,
        margin: invMargin,
      };
    });

    let tRev = 0;
    let tCost = 0;
    let tProfit = 0;

    for (const inv of data) {
      tRev += inv.revenue;
      tCost += inv.cost;
      tProfit += inv.profit;
    }

    return {
      invoiceProfitability: data,
      totalRevenue: tRev,
      totalCost: tCost,
      totalProfit: tProfit,
    };
  }, [salesData]);

  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Profitability Report</h1>
        <div className="text-xs text-muted-foreground font-semibold bg-secondary/50 border border-border px-3 py-1.5 rounded-lg">
          Zero-Trust Cost Snapshotting Active
        </div>
      </div>

      {/* Filters Form Panel */}
      <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-border p-3 rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-border p-3 rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="border border-border p-3 rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm cursor-pointer"
            >
              <option value="">All Customers</option>
              {customers.filter(c => c.isActive).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadProfitReport}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold p-3 rounded-lg transition-colors cursor-pointer shadow-md shadow-primary/10"
            >
              Run Report
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl font-medium shadow-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground font-semibold flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Calculating profitability metrics...</span>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Sales (Base)</p>
              <h2 className="text-2xl font-extrabold text-foreground mt-1">₹ {totalRevenue.toFixed(2)}</h2>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Cost of Goods</p>
              <h2 className="text-2xl font-extrabold text-foreground mt-1">₹ {totalCost.toFixed(2)}</h2>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Net Gross Profit</p>
              <h2 className={`text-2xl font-extrabold mt-1 ${totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"}`}>
                ₹ {totalProfit.toFixed(2)}
              </h2>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Profit Margin</p>
              <h2 className={`text-2xl font-extrabold mt-1 ${overallMargin >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"}`}>
                {overallMargin.toFixed(2)}%
              </h2>
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-bold">Transaction Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-4 text-left font-semibold">Invoice No</th>
                    <th className="p-4 text-left font-semibold">Date</th>
                    <th className="p-4 text-left font-semibold">Customer</th>
                    <th className="p-4 text-right font-semibold">Total Cost (Dr)</th>
                    <th className="p-4 text-right font-semibold">Sales Revenue (Cr)</th>
                    <th className="p-4 text-right font-semibold">Profit (Net)</th>
                    <th className="p-4 text-right font-semibold">Margin (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoiceProfitability.map((row) => (
                    <tr key={row.id} className="hover:bg-secondary/20 transition-colors duration-150">
                      <td className="p-4 font-mono font-semibold text-foreground">{row.invoiceNo}</td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(row.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-foreground font-medium">{row.customerName}</td>
                      <td className="p-4 text-right font-mono text-muted-foreground">₹{row.cost.toFixed(2)}</td>
                      <td className="p-4 text-right font-mono text-foreground">₹{row.revenue.toFixed(2)}</td>
                      <td className={`p-4 text-right font-mono font-bold ${row.profit >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"}`}>
                        ₹{row.profit.toFixed(2)}
                      </td>
                      <td className={`p-4 text-right font-mono font-semibold ${row.margin >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"}`}>
                        {row.margin.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                  {invoiceProfitability.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-muted-foreground font-medium">
                        No transactions recorded for the selected search filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProfitReport;
