import { useState, useEffect, useCallback } from "react";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import CommonFilter from "../../components/common/CommonFilter";
import CommonCard from "../../components/common/CommonCard";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import api from "../../utils/api";
import { Loader2, Printer, RotateCcw, Search, ShoppingCart } from "lucide-react";

const INPUT_CLASS =
  "h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors";
const LABEL_CLASS =
  "block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

/**
 * Date-range and supplier-filtered purchase register report.
 */
function PurchaseReport() {
  const vendors = useStore((state) => state.vendors);
  const fetchVendors = useStore((state) => state.fetchVendors);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [vendorId, setVendorId] = useState("");

  const [purchaseData, setPurchaseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPurchaseReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(
        `/reports/purchase?vendorId=${vendorId}&fromDate=${fromDate}&toDate=${toDate}`
      );
      setPurchaseData(res.data || []);
    } catch (err) {
      console.error("Failed to load purchase report:", err);
      setError("Failed to load purchase report. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [vendorId, fromDate, toDate]);

  useEffect(() => {
    fetchVendors().catch((err) => console.error("Failed to fetch vendors:", err));
    const timer = setTimeout(() => {
      loadPurchaseReport();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchVendors, loadPurchaseReport]);

  const totalPurchase = purchaseData.reduce((total, item) => total + item.grandTotal, 0);
  const totalInvoices = purchaseData.length;
  const averageInvoiceValue = totalInvoices > 0 ? Math.round(totalPurchase / totalInvoices) : 0;

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Purchase Report"
        subtitle="Audit supplier bill volume, procurement spend, and average purchase order value"
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
            <label className={LABEL_CLASS}>Vendor</label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              <option value="">All Vendors</option>
              {vendors
                .filter((v) => v.isActive)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
            </select>
          </div>

          <button
            type="button"
            onClick={loadPurchaseReport}
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
              setVendorId("");
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
          <span>Loading purchase report...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CommonCard
              title="Total Purchases"
              value={`₹ ${totalPurchase.toFixed(2)}`}
              color="text-foreground"
              icon={ShoppingCart}
            />
            <CommonCard title="Total Bills" value={String(totalInvoices)} />
            <CommonCard
              title="Average Bill Value"
              value={`₹ ${averageInvoiceValue.toFixed(2)}`}
              color="text-primary-text"
            />
          </div>

          <TableWrapper>
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Invoice No</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Vendor</th>
                  <th className="px-4 py-2.5 text-right">Qty</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {purchaseData.map((purchase) => (
                  <tr key={purchase.id} className="elevated-table-row transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground">
                      {purchase.invoiceNo}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {purchase.invoiceDate.split("T")[0]}
                    </td>
                    <td className="px-4 py-2.5 text-foreground font-medium">
                      {purchase.vendor?.name || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                      {purchase.totalQty}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground tabular-nums">
                      ₹ {Number(purchase.grandTotal || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {purchaseData.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No purchase invoices found for this period.
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

export default PurchaseReport;
