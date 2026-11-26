import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TableWrapper from "../components/common/TableWrapper";
import CommonPageHeader from "../components/common/CommonPageHeader";
import CommonCard from "../components/common/CommonCard";
import api from "../utils/api";
import { formatINR } from "../utils/formatters";
import {
  Loader2,
  TrendingUp,
  ShoppingCart,
  PackageSearch,
  BarChart3,
  AlertCircle,
  Shield,
  ChevronRight,
  Users,
  Truck,
} from "lucide-react";

const REPORT_DIRECTORY = [
  {
    name: "Sales Register Report",
    category: "Revenue & GST",
    description: "Date-filtered tax invoices, customer breakdown, and net receivables.",
    path: "/sales-report",
    icon: TrendingUp,
  },
  {
    name: "Purchase Register Report",
    category: "Procurement & ITC",
    description: "Vendor bills, input tax totals, and paid vs payable breakdown.",
    path: "/purchase-report",
    icon: ShoppingCart,
  },
  {
    name: "Inventory & Stock Valuation",
    category: "Warehouse",
    description: "On-hand stock quantities, reorder status, and inventory valuation.",
    path: "/stock-report",
    icon: PackageSearch,
  },
  {
    name: "Profit & Loss Statement",
    category: "Financials",
    description: "Gross revenue, purchase costs, direct margins, and net profitability.",
    path: "/profit-report",
    icon: BarChart3,
  },
  {
    name: "Outstanding Receivables & Payables",
    category: "Aging",
    description: "Unpaid party balances requiring follow-up or settlement.",
    path: "/outstanding-report",
    icon: AlertCircle,
  },
  {
    name: "GST Compliance & E-Way Filing",
    category: "Statutory",
    description: "GSTR-3B readiness, GSTR-1 return preview, and E-Way bill queue.",
    path: "/compliance-dashboard",
    icon: Shield,
  },
];

/**
 * Unified financial & statutory reports index with summary KPIs.
 */
function ReportsDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/summary");
      setSummary(res.data);
    } catch (err) {
      console.error("Failed to load reports summary:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSummary();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadSummary]);

  const financeCards = [
    {
      title: "Total Sales",
      value: summary ? formatINR(summary.totalSales) : formatINR(0),
      color: "text-success",
      icon: TrendingUp,
    },
    {
      title: "Total Purchases",
      value: summary ? formatINR(summary.totalPurchases) : formatINR(0),
      color: "text-foreground",
      icon: ShoppingCart,
    },
  ];

  const operationalCards = [
    {
      title: "Active Customers",
      value: summary ? String(summary.activeCustomersCount) : "0",
      color: "text-foreground",
      icon: Users,
    },
    {
      title: "Active Vendors",
      value: summary ? String(summary.activeVendorsCount) : "0",
      color: "text-foreground",
      icon: Truck,
    },
    {
      title: "Low Stock Items",
      value: summary ? `${summary.lowStockItemsCount} SKUs` : "0 SKUs",
      color: summary?.lowStockItemsCount > 0 ? "text-destructive" : "text-foreground",
      icon: PackageSearch,
    },
  ];

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Reports Overview"
        subtitle="Financial statements, stock valuation registers, and GST compliance queues"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/sales-report")}
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium cursor-pointer transition-colors"
            >
              Sales Report
            </button>
            <button
              type="button"
              onClick={() => navigate("/purchase-report")}
              className="h-8 px-3 rounded-md bg-card border border-border text-foreground hover:bg-secondary/70 text-xs font-medium cursor-pointer transition-colors"
            >
              Purchase Report
            </button>
            <button
              type="button"
              onClick={() => navigate("/stock-report")}
              className="h-8 px-3 rounded-md bg-card border border-border text-foreground hover:bg-secondary/70 text-xs font-medium cursor-pointer transition-colors"
            >
              Stock Report
            </button>
          </div>
        }
      />

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary-text" aria-hidden="true" />
          <span>Refreshing report summary&hellip;</span>
        </div>
      )}

      {/* Balanced KPI Strip: Financial Aggregates + Operational Volume */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {financeCards.map((card, index) => (
            <CommonCard
              key={index}
              title={card.title}
              value={card.value}
              color={card.color}
              icon={card.icon}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {operationalCards.map((card, index) => (
            <CommonCard
              key={index}
              title={card.title}
              value={card.value}
              color={card.color}
              icon={card.icon}
            />
          ))}
        </div>
      </div>

      {/* Report Directory Table */}
      <div className="bg-card rounded-lg border border-border surface-shadow overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Financial & Operational Reports</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a ledger or statutory register to filter and print
            </p>
          </div>
        </div>

        <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-2.5">Report Name</th>
                <th className="px-4 py-2.5 hidden sm:table-cell">Category</th>
                <th className="px-4 py-2.5 hidden md:table-cell">Description</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {REPORT_DIRECTORY.map((report) => {
                const Icon = report.icon;
                return (
                  <tr
                    key={report.path}
                    className="elevated-table-row transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-primary-text shrink-0" aria-hidden="true" />
                        <span>{report.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {report.category}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {report.description}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => navigate(report.path)}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-input-bg hover:bg-secondary text-xs font-medium text-primary-text erp-focus-ring cursor-pointer transition-colors"
                      >
                        <span>Open</span>
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrapper>
      </div>
    </div>
  );
}

export default ReportsDashboard;
