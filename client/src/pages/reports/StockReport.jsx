import { useState, useEffect, useCallback } from "react";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import CommonFilter from "../../components/common/CommonFilter";
import CommonCard from "../../components/common/CommonCard";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import StatusBadge from "../../components/common/StatusBadge";
import api from "../../utils/api";
import { Loader2, PackageSearch, Printer, RotateCcw, Search } from "lucide-react";

const INPUT_CLASS =
  "h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors";
const LABEL_CLASS =
  "block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

/**
 * Warehouse inventory valuation and low-stock status report.
 */
function StockReport() {
  const items = useStore((state) => state.items);
  const fetchItems = useStore((state) => state.fetchItems);

  const [category, setCategory] = useState("");
  const [itemId, setItemId] = useState("");
  const [stockStatus, setStockStatus] = useState("");

  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStockReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(
        `/reports/stock?category=${category}&itemId=${itemId}&stockStatus=${stockStatus}`
      );
      setStockData(res.data || []);
    } catch (err) {
      console.error("Failed to load stock report:", err);
      setError("Failed to load stock report. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [category, itemId, stockStatus]);

  useEffect(() => {
    fetchItems();
    const timer = setTimeout(() => {
      loadStockReport();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchItems, loadStockReport]);

  const uniqueCategories = [...new Set(items.map((i) => i.category).filter(Boolean))];
  const totalItems = stockData.length;
  const totalStockQty = stockData.reduce((total, item) => total + item.currentStock, 0);
  const stockValue = stockData.reduce(
    (total, item) => total + item.currentStock * item.purchaseRate,
    0
  );
  const lowStockItems = stockData.filter((item) => item.currentStock < 10).length;

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Stock Report"
        subtitle="Track on-hand quantities, cost-basis inventory valuation, and reorder alerts"
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
            <label className={LABEL_CLASS}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              <option value="">All Categories</option>
              {uniqueCategories.map((cat, idx) => (
                <option key={idx} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>Product</label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              <option value="">All Items</option>
              {items
                .filter((i) => i.isActive)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>Stock Status</label>
            <select
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              <option value="">All Status</option>
              <option value="Low Stock">Low Stock</option>
              <option value="In Stock">In Stock</option>
            </select>
          </div>

          <button
            type="button"
            onClick={loadStockReport}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium cursor-pointer transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Apply Filter</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategory("");
              setItemId("");
              setStockStatus("");
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
          <span>Loading stock valuation...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <CommonCard title="Total Items" value={String(totalItems)} icon={PackageSearch} />
            <CommonCard title="Total Units" value={String(totalStockQty)} color="text-success" />
            <CommonCard
              title="Stock Value (Cost)"
              value={`₹ ${stockValue.toFixed(2)}`}
              color="text-primary-text"
            />
            <CommonCard
              title="Low Stock SKUs"
              value={String(lowStockItems)}
              color={lowStockItems > 0 ? "text-destructive" : "text-foreground"}
            />
          </div>

          <TableWrapper>
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Item Name</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5 text-right">On Hand</th>
                  <th className="px-4 py-2.5 text-right">Purchase Rate</th>
                  <th className="px-4 py-2.5 text-right">Sale Rate</th>
                  <th className="px-4 py-2.5 text-right">Valuation</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {stockData.map((item, index) => (
                  <tr key={index} className="elevated-table-row transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{item.itemName}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {item.category || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground tabular-nums">
                      {item.currentStock}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      ₹ {Number(item.purchaseRate || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      ₹ {Number(item.saleRate || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground tabular-nums">
                      ₹ {(item.currentStock * item.purchaseRate).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5">
                      {item.currentStock < 10 ? (
                        <StatusBadge variant="destructive">Low Stock</StatusBadge>
                      ) : (
                        <StatusBadge variant="success">In Stock</StatusBadge>
                      )}
                    </td>
                  </tr>
                ))}
                {stockData.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No stock records found matching filters.
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

export default StockReport;
