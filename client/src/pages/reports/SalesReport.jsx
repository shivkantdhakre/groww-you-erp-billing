import { useState, useEffect, useCallback } from "react";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import CommonFilter from "../../components/common/CommonFilter";
import CommonCard from "../../components/common/CommonCard";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import api from "../../utils/api";
import { formatINR } from "../../utils/formatters";
import { Loader2, Printer, RotateCcw, Search, TrendingUp } from "lucide-react";

const INPUT_CLASS = "erp-input";
const LABEL_CLASS = "erp-label";

/**
 * Date-range and party-filtered sales invoice register with invoice average KPIs.
 */
function SalesReport() {
  const customers = useStore((state) => state.customers);
  const fetchCustomers = useStore((state) => state.fetchCustomers);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [customerId, setCustomerId] = useState("");

  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSalesReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(
        `/reports/sales?customerId=${customerId}&fromDate=${fromDate}&toDate=${toDate}`
      );
      setSalesData(res.data || []);
    } catch (err) {
      console.error("Failed to load sales report:", err);
      setError("Failed to load sales report. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [customerId, fromDate, toDate]);

  useEffect(() => {
    fetchCustomers().catch((err) => console.error("Failed to fetch customers:", err));
    const timer = setTimeout(() => {
      loadSalesReport();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCustomers, loadSalesReport]);

  const totalSales = salesData.reduce((total, item) => total + item.grandTotal, 0);
  const totalInvoices = salesData.length;
  const averageInvoiceValue = totalInvoices > 0 ? Math.round(totalSales / totalInvoices) : 0;

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Sales Report"
        subtitle="Analyze revenue totals, customer invoice volume, and average ticket size"
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

      <ValidationMessage
        type="error"
        message={error}
        onDismiss={() => setError("")}
        className="mt-0!"
      />

      <CommonFilter className="no-print mb-0!">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
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
            onClick={loadSalesReport}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Run Report</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setCustomerId("");
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
          <span>Loading sales report&hellip;</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CommonCard
              title="Total Sales"
              value={formatINR(totalSales)}
              color="text-success"
              icon={TrendingUp}
            />
            <CommonCard title="Total Invoices" value={String(totalInvoices)} />
            <CommonCard
              title="Average Invoice Value"
              value={formatINR(averageInvoiceValue)}
              color="text-primary-text"
            />
          </div>

          <TableWrapper>
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Invoice No</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5 text-right">Qty</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {salesData.map((sale) => (
                  <tr key={sale.id} className="elevated-table-row transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                      {sale.invoiceNo}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {sale.invoiceDate.split("T")[0]}
                    </td>
                    <td className="px-4 py-2.5 text-foreground font-medium">
                      {sale.customer?.name || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                      {sale.totalQty}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground tabular-nums whitespace-nowrap">
                      {formatINR(sale.grandTotal)}
                    </td>
                  </tr>
                ))}
                {salesData.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No sales invoices found for this period.
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

export default SalesReport;
