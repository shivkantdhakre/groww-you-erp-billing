import { useState, useEffect, useCallback } from "react";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";

function StockReport() {
  const items = useStore((state) => state.items);
  const fetchItems = useStore((state) => state.fetchItems);

  const [category, setCategory] = useState("");
  const [itemId, setItemId] = useState("");
  const [stockStatus, setStockStatus] = useState("");

  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadStockReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/reports/stock?category=${category}&itemId=${itemId}&stockStatus=${stockStatus}`
      );
      setStockData(res.data || []);
    } catch (err) {
      console.error("Failed to load stock report:", err);
      alert("Failed to load stock report");
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

  // Extract unique categories from items cache for filter dropdown
  const uniqueCategories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  const totalItems = stockData.length;

  const totalStockQty = stockData.reduce(
    (total, item) => total + item.currentStock,
    0
  );

  const stockValue = stockData.reduce(
    (total, item) => total + item.currentStock * item.purchaseRate,
    0
  );

  const lowStockItems = stockData.filter(
    (item) => item.currentStock < 10
  ).length;

  return (
    <div className="space-y-6 text-foreground">
      <h1 className="text-3xl font-bold tracking-tight">
        Stock Report
      </h1>

      <p className="text-muted-foreground mb-6">
        Track inventory stock status
      </p>

      {/* Filters */}
      <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-card border border-border p-3 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="bg-card border border-border p-3 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Items</option>
            {items.filter(i => i.isActive).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value)}
            className="bg-card border border-border p-3 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Status</option>
            <option value="Low Stock">Low Stock</option>
            <option value="In Stock">In Stock</option>
          </select>

          <button
            onClick={loadStockReport}
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-2 px-6 rounded-lg transition-colors cursor-pointer shadow-md"
          >
            Search
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center mt-6 text-muted-foreground font-semibold">
          Loading stock report...
        </div>
      )}

      {!loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
              <p className="text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold text-primary">
                {totalItems}
              </p>
            </div>

            <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
              <p className="text-muted-foreground">Total Stock Qty</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {totalStockQty}
              </p>
            </div>

            <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
              <p className="text-muted-foreground">Stock Value (at Cost)</p>
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                ₹ {stockValue.toFixed(2)}
              </p>
            </div>

            <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
              <p className="text-muted-foreground">Low Stock Items</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {lowStockItems}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-center">
              <thead className="bg-muted text-muted-foreground border-b border-border text-sm font-semibold">
                <tr>
                  <th className="p-3 text-left">Item Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Current Stock</th>
                  <th className="p-3">Purchase Rate</th>
                  <th className="p-3">Sale Rate</th>
                  <th className="p-3">Stock Value</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border text-sm">
                {stockData.map((item, index) => (
                  <tr key={index} className="hover:bg-muted/50 transition-colors">
                    <td className="p-3 text-left font-medium text-foreground">{item.itemName}</td>
                    <td className="p-3 text-muted-foreground">{item.category}</td>
                    <td className="p-3 font-semibold text-foreground">{item.currentStock}</td>
                    <td className="p-3 text-muted-foreground">₹ {item.purchaseRate.toFixed(2)}</td>
                    <td className="p-3 text-muted-foreground">₹ {item.saleRate.toFixed(2)}</td>
                    <td className="p-3 font-medium text-foreground">
                      ₹ {(item.currentStock * item.purchaseRate).toFixed(2)}
                    </td>
                    <td className="p-3">
                      {item.currentStock < 10 ? (
                        <span className="bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-full text-xs font-semibold">
                          Low Stock
                        </span>
                      ) : (
                        <span className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold">
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {stockData.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-6 text-muted-foreground text-center">
                      No stock records found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default StockReport;