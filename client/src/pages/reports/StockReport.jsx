import { useState, useEffect } from "react";
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

  useEffect(() => {
    fetchItems();
    loadStockReport();
  }, []);

  const loadStockReport = async () => {
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
  };

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
    <div>
      <h1 className="text-3xl font-bold">
        Stock Report
      </h1>

      <p className="text-gray-500 mb-6">
        Track inventory stock status
      </p>

      {/* Filters */}
      <div className="bg-white p-5 rounded-xl shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border p-3 rounded-lg"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className="border p-3 rounded-lg"
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
            className="border p-3 rounded-lg"
          >
            <option value="">All Status</option>
            <option value="Low Stock">Low Stock</option>
            <option value="In Stock">In Stock</option>
          </select>

          <button
            onClick={loadStockReport}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
          >
            Search
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center mt-6 text-gray-500 font-semibold">
          Loading stock report...
        </div>
      )}

      {!loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl shadow">
              <p className="text-gray-500">Total Items</p>
              <p className="text-2xl font-bold text-blue-600">
                {totalItems}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              <p className="text-gray-500">Total Stock Qty</p>
              <p className="text-2xl font-bold text-green-600">
                {totalStockQty}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              <p className="text-gray-500">Stock Value (at Cost)</p>
              <p className="text-2xl font-bold text-purple-600">
                ₹ {stockValue.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              <p className="text-gray-500">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-600">
                {lowStockItems}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white p-5 rounded-xl shadow">
            <table className="w-full text-center">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="p-3">Item Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Current Stock</th>
                  <th className="p-3">Purchase Rate</th>
                  <th className="p-3">Sale Rate</th>
                  <th className="p-3">Stock Value</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {stockData.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3 text-left">{item.itemName}</td>
                    <td className="p-3">{item.category}</td>
                    <td className="p-3">{item.currentStock}</td>
                    <td className="p-3">₹ {item.purchaseRate.toFixed(2)}</td>
                    <td className="p-3">₹ {item.saleRate.toFixed(2)}</td>
                    <td className="p-3">
                      ₹ {(item.currentStock * item.purchaseRate).toFixed(2)}
                    </td>
                    <td className="p-3">
                      {item.currentStock < 10 ? (
                        <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm">
                          Low Stock
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm">
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {stockData.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-6 text-gray-500 text-center">
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