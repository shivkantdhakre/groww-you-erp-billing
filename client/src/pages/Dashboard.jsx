import { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import api from "../utils/api";
import { Link } from "react-router-dom";
import AIPipelineInsightsCard from "../components/dashboard/AIPipelineInsightsCard";
import {
  Users,
  Truck,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  Zap,
  Activity,
  Receipt,
  Clock,
  Package,
  FileText,
  FileInput
} from "lucide-react";

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
        <div className="h-24 bg-muted rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="h-24 bg-muted rounded-xl"></div>
          <div className="h-24 bg-muted rounded-xl"></div>
          <div className="h-24 bg-muted rounded-xl"></div>
          <div className="h-24 bg-muted rounded-xl"></div>
          <div className="h-24 bg-muted rounded-xl"></div>
        </div>
        <div className="h-44 bg-muted rounded-xl"></div>
        <div className="h-64 bg-muted rounded-xl"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-xl shadow border border-destructive/20 flex flex-col items-start gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 shrink-0" aria-hidden="true" />
          <h2 className="text-xl font-bold">Error Loading Dashboard</h2>
        </div>
        <p className="text-sm">{error || "An unexpected error occurred."}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/95 font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer"
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
    <div className="space-y-6 text-foreground">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary via-primary/95 to-accent text-primary-foreground p-6 rounded-xl shadow-lg relative overflow-hidden transition-colors duration-300">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Welcome, {user?.name || "Admin"}
        </h1>
        <p className="mt-2 text-primary-foreground/90 font-medium">
          {company?.name || "Groww You ERP Headquarters"} &bull; Financial Year: {company?.financialYear || "N/A"}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card p-5 rounded-xl shadow border border-border hover:shadow-md transition flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Active Customers</p>
            <h2 className="text-3xl font-extrabold text-foreground mt-1">{activeCustomersCount}</h2>
          </div>
          <Users className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
        </div>

        <div className="bg-card p-5 rounded-xl shadow border border-border hover:shadow-md transition flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Active Vendors</p>
            <h2 className="text-3xl font-extrabold text-foreground mt-1">{activeVendorsCount}</h2>
          </div>
          <Truck className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
        </div>

        <div className="bg-card p-5 rounded-xl shadow border border-border hover:shadow-md transition flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Low Stock Items</p>
            <h2 className={`text-3xl font-extrabold mt-1 ${lowStockItemsCount > 0 ? "text-destructive" : "text-foreground"}`}>{lowStockItemsCount}</h2>
          </div>
          <AlertTriangle className={`w-5 h-5 shrink-0 ${lowStockItemsCount > 0 ? "text-destructive" : "text-muted-foreground/60"}`} aria-hidden="true" />
        </div>

        <div className="bg-card p-5 rounded-xl shadow border border-border hover:shadow-md transition flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Sales</p>
            <h2 className="text-3xl font-extrabold text-emerald-500 mt-1">₹ {totalSales.toLocaleString()}</h2>
          </div>
          <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" aria-hidden="true" />
        </div>

        <div className="bg-card p-5 rounded-xl shadow border border-border hover:shadow-md transition flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Purchase</p>
            <h2 className="text-3xl font-extrabold text-primary mt-1">₹ {totalPurchases.toLocaleString()}</h2>
          </div>
          <ShoppingCart className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card p-5 rounded-xl shadow border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-500 shrink-0" aria-hidden="true" />
          <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link to="/customers" className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 p-3 rounded-lg text-center font-semibold transition cursor-pointer flex items-center justify-center gap-2">
            <Users className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>Add Customer</span>
          </Link>
          <Link to="/vendors" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 p-3 rounded-lg text-center font-semibold transition cursor-pointer flex items-center justify-center gap-2">
            <Truck className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>Add Vendor</span>
          </Link>
          <Link to="/inventory" className="bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 p-3 rounded-lg text-center font-semibold transition cursor-pointer flex items-center justify-center gap-2">
            <Package className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>Add Product</span>
          </Link>
          <Link to="/sales-invoice" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 p-3 rounded-lg text-center font-semibold transition cursor-pointer flex items-center justify-center gap-2">
            <FileText className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>Sales Invoice</span>
          </Link>
          <Link to="/purchase-invoice" className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 p-3 rounded-lg text-center font-semibold transition cursor-pointer flex items-center justify-center gap-2">
            <FileInput className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>Purchase Invoice</span>
          </Link>
        </div>
      </div>

      {/* V2 Metric Cards (Monthly & Outstanding) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-xl shadow border border-border">
          <p className="text-muted-foreground text-sm font-semibold">Monthly Sales</p>
          <h2 className="text-2xl font-bold text-emerald-500 mt-1">
            ₹ {monthlyStats.sales.toLocaleString()}
          </h2>
        </div>

        <div className="bg-card p-5 rounded-xl shadow border border-border">
          <p className="text-muted-foreground text-sm font-semibold">Monthly Purchase</p>
          <h2 className="text-2xl font-bold text-primary mt-1">
            ₹ {monthlyStats.purchase.toLocaleString()}
          </h2>
        </div>

        <div className="bg-card p-5 rounded-xl shadow border border-border">
          <p className="text-muted-foreground text-sm font-semibold">Outstanding Amount</p>
          <h2 className="text-2xl font-bold text-destructive mt-1">
            ₹ {monthlyStats.outstanding.toLocaleString()}
          </h2>
        </div>
      </div>

      {/* 3-Column Layout: Business Overview & AI Pipeline Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column Span 2: Business Summary & Recent Activities */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card p-5 rounded-xl shadow border border-border text-foreground flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                  <h2 className="text-lg font-bold text-foreground">Profitability Summary</h2>
                </div>
                <div className="space-y-2 font-medium text-muted-foreground">
                  <div className="flex justify-between border-b border-border/40 pb-2">
                    <span>Total Sales Revenue</span>
                    <span className="text-foreground">₹ {totalSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-2">
                    <span>Total Purchase Cost</span>
                    <span className="text-foreground">₹ {totalPurchases.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-foreground font-semibold">Net Estimated Profit</span>
                    <span className={`font-bold ${totalProfit >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                      ₹ {totalProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-card p-5 rounded-xl shadow border border-border text-foreground">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                <h2 className="text-lg font-bold text-foreground">Recent Activities</h2>
              </div>
              {recentActivities.length > 0 ? (
                <ul className="space-y-3">
                  {recentActivities.map((item) => (
                    <li key={item.id} className="border-b border-border/40 pb-2 flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-foreground text-sm">{item.action}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.name}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground/80 font-semibold uppercase">
                        {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm py-4">No recent activity recorded.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Sales Pipeline Insights Component */}
        <div className="lg:col-span-1">
          <AIPipelineInsightsCard />
        </div>
      </div>

      {/* Today's Stats & Low Stock Alert */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Stats */}
        <div className="bg-card p-5 rounded-xl shadow border border-border text-foreground">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-foreground">Today's Stats</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase">Today Sales</p>
              <h3 className="text-xl font-bold text-emerald-500 mt-1">₹ {todayStats.sales.toLocaleString()}</h3>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase">Today Purchases</p>
              <h3 className="text-xl font-bold text-primary mt-1">₹ {todayStats.purchase.toLocaleString()}</h3>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-semibold uppercase">Total Invoices</p>
              <h3 className="text-xl font-bold text-foreground mt-1">{todayStats.orders}</h3>
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-card p-5 rounded-xl shadow border border-border text-foreground">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-destructive">Low Stock Alerts</h2>
          </div>
          {lowStockItems.length > 0 ? (
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {lowStockItems.map((item, index) => (
                <div key={index} className="flex justify-between border-b border-border/40 py-1 text-sm font-medium">
                  <span className="text-foreground">{item.name}</span>
                  <span className="text-destructive font-semibold">{item.stock} left</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4">All products are well stocked.</p>
          )}
        </div>
      </div>

      {/* Top Customers & Vendors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card p-5 rounded-xl shadow border border-border text-foreground">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-foreground">Top Customers</h2>
          </div>
          {topCustomers.length > 0 ? (
            <div className="space-y-2">
              {topCustomers.map((customer, index) => (
                <div key={index} className="flex justify-between border-b border-border/40 py-2 text-sm font-medium text-foreground">
                  <span>{customer.name}</span>
                  <span className="text-primary font-semibold">₹ {customer.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4">No client invoice activity recorded.</p>
          )}
        </div>

        <div className="bg-card p-5 rounded-xl shadow border border-border text-foreground">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-foreground">Top Vendors</h2>
          </div>
          {topVendors.length > 0 ? (
            <div className="space-y-2">
              {topVendors.map((vendor, index) => (
                <div key={index} className="flex justify-between border-b border-border/40 py-2 text-sm font-medium text-foreground">
                  <span>{vendor.name}</span>
                  <span className="text-primary font-semibold">₹ {vendor.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4">No supplier transaction activity recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;