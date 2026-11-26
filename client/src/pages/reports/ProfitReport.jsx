import { useState, useEffect, useMemo, useCallback } from "react";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import CommonFilter from "../../components/common/CommonFilter";
import CommonCard from "../../components/common/CommonCard";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import StatusBadge from "../../components/common/StatusBadge";
import api from "../../utils/api";
import { BarChart3, Loader2, Printer, Search, ShieldCheck } from "lucide-react";

const INPUT_CLASS =
  "h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors";
const LABEL_CLASS =
  "block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

/**
 * Per-invoice gross profitability statement computed from cost snapshots.
 */
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

  const { invoiceProfitability, totalRevenue, totalCost, totalProfit } = useMemo(() => {
    const data = salesData.map((invoice) => {
      let invRevenue = 0;
      let invCost = 0;

      invoice.items.forEach((line) => {
        const lineQty = line.qty;
        const lineSellPrice = line.price;
        const lineCostPrice = line.purchasePrice || 0.0;

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
        grandTotal: invoice.grandTotal,
        revenue: invRevenue,
        cost: invCost,
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
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Profitability Report"
        subtitle="Pre-tax margin analysis calculated from line-level historical purchase cost snapshots"
        badge={
          <StatusBadge variant="primary">
            <ShieldCheck className="w-3 h-3" />
            <span>Cost Snapshot Active</span>
          </StatusBadge>
        }
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-card hover:bg-secondary/70 text-xs font-medium text-foreground cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        }
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

          <div>
            <label className={LABEL_CLASS}>Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              <option value="">All Customers</option>
              {customers
                .filter((c) => c.isActive)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <button
            type="button"
            onClick={loadProfitReport}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Run Analysis</span>
          </button>
        </div>
      </CommonFilter>

      <ValidationMessage
        type="error"
        message={error}
        onDismiss={() => setError("")}
        className="mt-0!"
      />

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary-text" />
          <span>Calculating profitability metrics...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <CommonCard
              title="Sales Revenue (Base)"
              value={`₹ ${totalRevenue.toFixed(2)}`}
              icon={BarChart3}
            />
            <CommonCard title="Cost of Goods Sold" value={`₹ ${totalCost.toFixed(2)}`} />
            <CommonCard
              title="Net Gross Profit"
              value={`₹ ${totalProfit.toFixed(2)}`}
              color={totalProfit >= 0 ? "text-success" : "text-destructive"}
            />
            <CommonCard
              title="Gross Margin"
              value={`${overallMargin.toFixed(2)}%`}
              color={overallMargin >= 0 ? "text-success" : "text-destructive"}
            />
          </div>

          <div className="bg-card rounded-lg border border-border surface-shadow overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Invoice Margin Breakdown</h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {invoiceProfitability.length} invoices
              </span>
            </div>
            <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5">Invoice No</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5 text-right">Cost (Dr)</th>
                    <th className="px-4 py-2.5 text-right">Revenue (Cr)</th>
                    <th className="px-4 py-2.5 text-right">Gross Profit</th>
                    <th className="px-4 py-2.5 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {invoiceProfitability.map((row) => (
                    <tr key={row.id} className="elevated-table-row transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground">
                        {row.invoiceNo}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                        {new Date(row.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 text-foreground font-medium">
                        {row.customerName}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                        ₹ {row.cost.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-foreground tabular-nums">
                        ₹ {row.revenue.toFixed(2)}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono font-semibold tabular-nums ${
                          row.profit >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        ₹ {row.profit.toFixed(2)}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums ${
                          row.margin >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {row.margin.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                  {invoiceProfitability.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-xs text-muted-foreground">
                        No transactions recorded for the selected filters.
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

export default ProfitReport;
