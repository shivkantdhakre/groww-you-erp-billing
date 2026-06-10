import { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import api from "../utils/api";
import { Link } from "react-router-dom";

function Dashboard() {
  const user = useStore((state) => state.user);
  const company = useStore((state) => state.company);
  const fetchCompany = useStore((state) => state.fetchCompany);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load company and dashboard summary concurrently
        const [summaryRes] = await Promise.all([
          api.get("/reports/summary"),
          company ? Promise.resolve(company) : fetchCompany().catch(() => null)
        ]);
        setData(summaryRes.data);
        setError("");
      } catch (err) {
        console.error("Failed to load dashboard summary:", err);
        setError("Failed to fetch live statistics from the server.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [company, fetchCompany]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-24 bg-gray-200 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="h-44 bg-gray-200 rounded-xl"></div>
        <div className="h-64 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-100 text-red-700 rounded-xl shadow border border-red-200">
        <h2 className="text-xl font-bold">Error Loading Dashboard</h2>
        <p className="mt-2">{error || "An unexpected error occurred."}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer"
        >
          Retry Load
        </button>
      </div>
    );
  }

  const {
    totalSales,
    totalPurchases,
    totalProfit,
    activeCustomersCount,
    activeVendorsCount,
    lowStockItemsCount,
    lowStockItems,
    recentActivities,
    topCustomers,
    topVendors,
    todayStats,
    monthlyStats
  } = data;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-500 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Welcome, {user?.name || "Admin"}
        </h1>
        <p className="mt-2 text-indigo-100 font-medium">
          {company?.name || "Groww You ERP Headquarters"} &bull; Financial Year: {company?.financialYear || "N/A"}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl shadow border border-gray-100 hover:shadow-md transition">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Active Customers</p>
          <h2 className="text-3xl font-extrabold text-slate-800 mt-1">{activeCustomersCount}</h2>
        </div>

        <div className="bg-white p-5 rounded-xl shadow border border-gray-100 hover:shadow-md transition">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Active Vendors</p>
          <h2 className="text-3xl font-extrabold text-slate-800 mt-1">{activeVendorsCount}</h2>
        </div>

        <div className="bg-white p-5 rounded-xl shadow border border-gray-100 hover:shadow-md transition">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Low Stock Items</p>
          <h2 className={`text-3xl font-extrabold mt-1 ${lowStockItemsCount > 0 ? "text-red-600" : "text-slate-800"}`}>{lowStockItemsCount}</h2>
        </div>

        <div className="bg-white p-5 rounded-xl shadow border border-gray-100 hover:shadow-md transition">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Sales</p>
          <h2 className="text-3xl font-extrabold text-green-600 mt-1">₹ {totalSales.toLocaleString()}</h2>
        </div>

        <div className="bg-white p-5 rounded-xl shadow border border-gray-100 hover:shadow-md transition">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Total Purchase</p>
          <h2 className="text-3xl font-extrabold text-blue-600 mt-1">₹ {totalPurchases.toLocaleString()}</h2>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-5 rounded-xl shadow border border-gray-100">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link to="/customers" className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-lg text-center font-semibold transition cursor-pointer">
            Add Customer
          </Link>
          <Link to="/vendors" className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-lg text-center font-semibold transition cursor-pointer">
            Add Vendor
          </Link>
          <Link to="/inventory" className="bg-violet-600 hover:bg-violet-500 text-white p-3 rounded-lg text-center font-semibold transition cursor-pointer">
            Add Product
          </Link>
          <Link to="/sales-invoice" className="bg-amber-600 hover:bg-amber-500 text-white p-3 rounded-lg text-center font-semibold transition cursor-pointer">
            Sales Invoice
          </Link>
          <Link to="/purchase-invoice" className="bg-rose-600 hover:bg-rose-500 text-white p-3 rounded-lg text-center font-semibold transition cursor-pointer">
            Purchase Invoice
          </Link>
        </div>
      </div>

      {/* V2 Metric Cards (Monthly & Outstanding) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow border border-gray-100">
          <p className="text-gray-500 text-sm">Monthly Sales</p>
          <h2 className="text-2xl font-bold text-emerald-600 mt-1">
            ₹ {monthlyStats.sales.toLocaleString()}
          </h2>
        </div>

        <div className="bg-white p-5 rounded-xl shadow border border-gray-100">
          <p className="text-gray-500 text-sm">Monthly Purchase</p>
          <h2 className="text-2xl font-bold text-indigo-600 mt-1">
            ₹ {monthlyStats.purchase.toLocaleString()}
          </h2>
        </div>

        <div className="bg-white p-5 rounded-xl shadow border border-gray-100">
          <p className="text-gray-500 text-sm">Outstanding Amount</p>
          <h2 className="text-2xl font-bold text-red-600 mt-1">
            ₹ {monthlyStats.outstanding.toLocaleString()}
          </h2>
        </div>
      </div>

      {/* Business Summary & Recent Activities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl shadow border border-gray-100 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3">Profitability Summary</h2>
            <div className="space-y-2 font-medium text-slate-700">
              <div className="flex justify-between border-b pb-2">
                <span>Total Sales Revenue</span>
                <span className="text-slate-800">₹ {totalSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Total Purchase Cost</span>
                <span className="text-slate-800">₹ {totalPurchases.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span>Net Estimated Profit</span>
                <span className={`font-bold ${totalProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  ₹ {totalProfit.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white p-5 rounded-xl shadow border border-gray-100">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Recent Activities</h2>
          {recentActivities.length > 0 ? (
            <ul className="space-y-3">
              {recentActivities.map((item) => (
                <li key={item.id} className="border-b border-gray-50 pb-2 flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{item.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.name}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">
                    {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm py-4">No recent activity recorded.</p>
          )}
        </div>
      </div>

      {/* Today's Stats & Low Stock Alert */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Stats */}
        <div className="bg-white p-5 rounded-xl shadow border border-gray-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Today's Stats</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase">Today Sales</p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">₹ {todayStats.sales.toLocaleString()}</h3>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase">Today Purchases</p>
              <h3 className="text-xl font-bold text-indigo-600 mt-1">₹ {todayStats.purchase.toLocaleString()}</h3>
            </div>
            <div>
              <p className="text-gray-400 text-xs font-semibold uppercase">Total Invoices</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{todayStats.orders}</h3>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white p-5 rounded-xl shadow border border-gray-100">
          <h2 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
            <span>⚠️</span> Low Stock Alerts
          </h2>
          {lowStockItems.length > 0 ? (
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {lowStockItems.map((item, index) => (
                <div key={index} className="flex justify-between border-b border-gray-50 py-1 text-sm font-medium">
                  <span className="text-slate-700">{item.name}</span>
                  <span className="text-red-600 font-semibold">{item.stock} left</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4">All products are well stocked.</p>
          )}
        </div>
      </div>

      {/* Top Customers & Vendors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl shadow border border-gray-100">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Top Customers</h2>
          {topCustomers.length > 0 ? (
            <div className="space-y-2">
              {topCustomers.map((customer, index) => (
                <div key={index} className="flex justify-between border-b border-gray-50 py-2 text-sm font-medium text-slate-700">
                  <span>{customer.name}</span>
                  <span className="text-indigo-600 font-semibold">₹ {customer.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4">No client invoice activity recorded.</p>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl shadow border border-gray-100">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Top Vendors</h2>
          {topVendors.length > 0 ? (
            <div className="space-y-2">
              {topVendors.map((vendor, index) => (
                <div key={index} className="flex justify-between border-b border-gray-50 py-2 text-sm font-medium text-slate-700">
                  <span>{vendor.name}</span>
                  <span className="text-indigo-600 font-semibold">₹ {vendor.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm py-4">No supplier transaction activity recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;