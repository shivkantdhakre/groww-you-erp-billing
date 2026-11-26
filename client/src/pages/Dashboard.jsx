import { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import api from "../utils/api";
import { Link } from "react-router-dom";
import AIPipelineInsightsCard from "../components/dashboard/AIPipelineInsightsCard";
import CommonPageHeader from "../components/common/CommonPageHeader";
import StatusBadge from "../components/common/StatusBadge";
import {
  Users,
  Truck,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  Activity,
  Receipt,
  Clock,
  Package,
  FileText,
  FileInput,
  ArrowUpRight,
  Shield,
} from "lucide-react";

const formatINR = (num) =>
  `₹ ${Number(num || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * Executive workspace dashboard organizing financial totals, monthly momentum,
 * operational alerts, top counterparties, and AI pipeline briefs.
 */
function Dashboard() {
  const user = useStore((state) => state.user);
  const company = useStore((state) => state.company);
  const activeBranchId = useStore((state) => state.activeBranchId);
  const fetchCompany = useStore((state) => state.fetchCompany);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [summaryRes] = await Promise.all([
          api.get("/reports/summary"),
          company ? Promise.resolve(company) : fetchCompany().catch(() => null),
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
  }, [company, fetchCompany, activeBranchId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-14 bg-muted rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="h-28 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-80 bg-muted rounded-lg" />
          <div className="h-80 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-5 bg-destructive/10 text-destructive rounded-lg border border-destructive/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold">Unable to Load Workspace Summary</h2>
            <p className="text-xs opacity-90 mt-0.5">{error || "An unexpected error occurred."}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-8 px-3.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-medium transition-colors cursor-pointer shrink-0"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    totalSales = 0,
    totalPurchases = 0,
    totalProfit = 0,
    activeCustomersCount = 0,
    activeVendorsCount = 0,
    lowStockItemsCount = 0,
    lowStockItems = [],
    recentActivities = [],
    topCustomers = [],
    topVendors = [],
    todayStats = { sales: 0, purchase: 0, orders: 0 },
    monthlyStats = { sales: 0, purchase: 0, outstanding: 0 },
  } = data;

  const grossMarginPct =
    totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-5 text-foreground">
      {/* Operational Header + Primary Workflow Triggers */}
      <CommonPageHeader
        title={`Welcome back, ${user?.name || "Admin"}`}
        subtitle={`${company?.name || "Groww You ERP"} · Financial Year ${
          company?.financialYear || "Active"
        }`}
        badge={
          lowStockItemsCount > 0 ? (
            <StatusBadge variant="warning">{lowStockItemsCount} low stock</StatusBadge>
          ) : (
            <StatusBadge variant="success">Inventory healthy</StatusBadge>
          )
        }
        actions={
          <>
            <Link
              to="/sales-invoice"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>New Sales Invoice</span>
            </Link>
            <Link
              to="/purchase-invoice"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-card border border-border text-foreground hover:bg-secondary/70 text-xs font-medium transition-colors"
            >
              <FileInput className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Purchase / OCR</span>
            </Link>
            <Link
              to="/compliance-dashboard"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-card border border-border text-foreground hover:bg-secondary/70 text-xs font-medium transition-colors"
            >
              <Shield className="w-3.5 h-3.5" aria-hidden="true" />
              <span>GST Filing</span>
            </Link>
          </>
        }
      />

      {/* Primary Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 surface-shadow">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Sales Revenue
            </span>
            <TrendingUp className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
          </div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground mt-2">
            {formatINR(totalSales)}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 tabular-nums">
            This month: <span className="font-medium text-foreground">{formatINR(monthlyStats.sales)}</span>
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 surface-shadow">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Purchases
            </span>
            <ShoppingCart className="w-4 h-4 text-primary-text shrink-0" aria-hidden="true" />
          </div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums text-foreground mt-2">
            {formatINR(totalPurchases)}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 tabular-nums">
            This month: <span className="font-medium text-foreground">{formatINR(monthlyStats.purchase)}</span>
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 surface-shadow">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Net Estimated Profit
            </span>
            <Receipt className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
          </div>
          <p
            className={`text-2xl font-semibold tracking-tight tabular-nums mt-2 ${
              totalProfit >= 0 ? "text-success" : "text-destructive"
            }`}
          >
            {formatINR(totalProfit)}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 tabular-nums">
            Gross margin: <span className="font-medium text-foreground">{grossMarginPct}%</span>
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 surface-shadow">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Outstanding Receivables
            </span>
            <AlertTriangle
              className={`w-4 h-4 shrink-0 ${
                monthlyStats.outstanding > 0 ? "text-warning" : "text-muted-foreground"
              }`}
              aria-hidden="true"
            />
          </div>
          <p
            className={`text-2xl font-semibold tracking-tight tabular-nums mt-2 ${
              monthlyStats.outstanding > 0 ? "text-warning" : "text-foreground"
            }`}
          >
            {formatINR(monthlyStats.outstanding)}
          </p>
          <Link
            to="/outstanding-report"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-text hover:underline mt-1.5"
          >
            <span>Review aging & dues</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Main Split: Operational Books & Shortcuts + AI Revenue Advisor */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        <div className="xl:col-span-2 space-y-5">
          {/* Today's Activity & Master Directory Strip */}
          <div className="bg-card border border-border rounded-lg surface-shadow overflow-hidden">
            <div className="px-4 sm:px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-secondary/35">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-text" aria-hidden="true" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Today's Ledger Pulse & Master Records
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Link
                  to="/customers"
                  className="px-2 py-0.5 rounded border border-border bg-card hover:bg-secondary/70 font-medium text-foreground transition-colors"
                >
                  + Customer
                </Link>
                <Link
                  to="/vendors"
                  className="px-2 py-0.5 rounded border border-border bg-card hover:bg-secondary/70 font-medium text-foreground transition-colors"
                >
                  + Vendor
                </Link>
                <Link
                  to="/inventory"
                  className="px-2 py-0.5 rounded border border-border bg-card hover:bg-secondary/70 font-medium text-foreground transition-colors"
                >
                  + Item
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="p-4">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Today Sales
                </p>
                <p className="text-base font-semibold tabular-nums text-success mt-1">
                  {formatINR(todayStats.sales)}
                </p>
              </div>
              <div className="p-4">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Today Purchase
                </p>
                <p className="text-base font-semibold tabular-nums text-foreground mt-1">
                  {formatINR(todayStats.purchase)}
                </p>
              </div>
              <div className="p-4">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Today Invoices
                </p>
                <p className="text-base font-semibold tabular-nums text-foreground mt-1">
                  {todayStats.orders}
                </p>
              </div>
              <div className="p-4">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Customers
                </p>
                <p className="text-base font-semibold tabular-nums text-foreground mt-1">
                  {activeCustomersCount}
                </p>
              </div>
              <div className="p-4">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Vendors
                </p>
                <p className="text-base font-semibold tabular-nums text-foreground mt-1">
                  {activeVendorsCount}
                </p>
              </div>
              <div className="p-4">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Low Stock
                </p>
                <p
                  className={`text-base font-semibold tabular-nums mt-1 ${
                    lowStockItemsCount > 0 ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {lowStockItemsCount}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Ledger Events & Low Stock Watchlist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Activities */}
            <div className="bg-card border border-border rounded-lg p-4 sm:p-5 surface-shadow">
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-text" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-foreground">Recent Ledger Activity</h2>
                </div>
                <Link to="/day-book" className="text-xs font-medium text-primary-text hover:underline">
                  Day Book &rarr;
                </Link>
              </div>
              {recentActivities.length > 0 ? (
                <ul className="divide-y divide-border/60">
                  {recentActivities.map((item) => (
                    <li key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                          {item.action}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.name}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium tabular-nums shrink-0">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No recent transactions recorded.
                </p>
              )}
            </div>

            {/* Low Stock Alert */}
            <div className="bg-card border border-border rounded-lg p-4 sm:p-5 surface-shadow">
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <Package
                    className={`w-4 h-4 ${
                      lowStockItems.length > 0 ? "text-destructive" : "text-primary-text"
                    }`}
                    aria-hidden="true"
                  />
                  <h2 className="text-sm font-semibold text-foreground">Low Stock Watchlist</h2>
                </div>
                <Link to="/stock-report" className="text-xs font-medium text-primary-text hover:underline">
                  Stock Report &rarr;
                </Link>
              </div>
              {lowStockItems.length > 0 ? (
                <div className="max-h-52 overflow-y-auto scrollbar-thin divide-y divide-border/60">
                  {lowStockItems.map((item, index) => (
                    <div
                      key={index}
                      className="py-2 first:pt-0 last:pb-0 flex justify-between items-center gap-3 text-xs sm:text-sm"
                    >
                      <span className="font-medium text-foreground truncate">{item.name}</span>
                      <StatusBadge variant="destructive" className="tabular-nums">
                        {item.stock} left
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  All inventory SKUs are above reorder thresholds.
                </p>
              )}
            </div>
          </div>

          {/* Top Customers & Vendors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-4 sm:p-5 surface-shadow">
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary-text" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-foreground">Top Customers</h2>
                </div>
                <Link to="/customer-ledger" className="text-xs font-medium text-primary-text hover:underline">
                  Ledgers &rarr;
                </Link>
              </div>
              {topCustomers.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {topCustomers.map((customer, index) => (
                    <div
                      key={index}
                      className="py-2 first:pt-0 last:pb-0 flex justify-between items-center gap-3 text-xs sm:text-sm"
                    >
                      <span className="font-medium text-foreground truncate">{customer.name}</span>
                      <span className="font-semibold text-primary-text tabular-nums shrink-0">
                        {formatINR(customer.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No customer invoice volume recorded yet.
                </p>
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-4 sm:p-5 surface-shadow">
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary-text" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-foreground">Top Vendors</h2>
                </div>
                <Link to="/vendor-ledger" className="text-xs font-medium text-primary-text hover:underline">
                  Ledgers &rarr;
                </Link>
              </div>
              {topVendors.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {topVendors.map((vendor, index) => (
                    <div
                      key={index}
                      className="py-2 first:pt-0 last:pb-0 flex justify-between items-center gap-3 text-xs sm:text-sm"
                    >
                      <span className="font-medium text-foreground truncate">{vendor.name}</span>
                      <span className="font-semibold text-foreground tabular-nums shrink-0">
                        {formatINR(vendor.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No vendor billing volume recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Pipeline Insights */}
        <div className="xl:col-span-1">
          <AIPipelineInsightsCard />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
