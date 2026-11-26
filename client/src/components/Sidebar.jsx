import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useStore } from "../store/useStore";
import BrandLogo from "./common/BrandLogo";
import {
  LayoutDashboard,
  Database,
  TrendingUp,
  ShoppingCart,
  Receipt,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Users,
  Truck,
  Package,
  FileText,
  Undo2,
  FileInput,
  CreditCard,
  Wallet,
  PenLine,
  ArrowLeftRight,
  BookMarked,
  Banknote,
  Building2,
  CalendarDays,
  PieChart,
  PackageSearch,
  AlertCircle,
  Shield,
  Building,
  UserCog,
  HardDrive,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

function NavIcon({ icon: Icon, isSubLink = false, className = "", ...props }) {
  if (!Icon) return null;
  return (
    <Icon
      className={`${isSubLink ? "w-3.5 h-3.5" : "w-4 h-4"} shrink-0 ${className}`}
      strokeWidth={isSubLink ? 1.6 : 1.75}
      aria-hidden="true"
      {...props}
    />
  );
}

function getActiveSection(pathname) {
  if (["/customers", "/vendors", "/inventory", "/leads"].includes(pathname)) {
    return "masters";
  }
  if (
    ["/sales-invoice", "/sales-return"].includes(pathname) ||
    pathname.startsWith("/print/sales-invoice") ||
    pathname.startsWith("/print/thermal-invoice")
  ) {
    return "sales";
  }
  if (
    ["/purchase-invoice", "/purchase-return"].includes(pathname) ||
    pathname.startsWith("/print/purchase-invoice")
  ) {
    return "purchase";
  }
  if (
    ["/payment-voucher", "/receipt-voucher", "/journal-voucher", "/contra-voucher"].includes(pathname) ||
    pathname.startsWith("/print/payment-voucher") ||
    pathname.startsWith("/print/receipt-voucher")
  ) {
    return "accounts";
  }
  if (
    ["/customer-ledger", "/vendor-ledger", "/cash-book", "/bank-book", "/day-book"].includes(pathname)
  ) {
    return "books";
  }
  if (
    [
      "/reports-dashboard",
      "/sales-report",
      "/purchase-report",
      "/stock-report",
      "/profit-report",
      "/outstanding-report",
      "/compliance-dashboard",
    ].includes(pathname)
  ) {
    return "reports";
  }
  if (
    [
      "/company-settings",
      "/user-management",
      "/role-management",
      "/backup-restore",
      "/pricing",
      "/profile-settings",
      "/checkout-test",
    ].includes(pathname)
  ) {
    return "settings";
  }
  return null;
}

const NAV_SECTIONS = [
  {
    key: "masters",
    label: "Masters & CRM",
    icon: Database,
    items: [
      { to: "/customers", label: "Customer Master", icon: Users },
      { to: "/leads", label: "CRM & AI Leads", icon: Sparkles },
      { to: "/vendors", label: "Vendor Master", icon: Truck },
      { to: "/inventory", label: "Item Master", icon: Package },
    ],
  },
  {
    key: "sales",
    label: "Sales",
    icon: TrendingUp,
    items: [
      { to: "/sales-invoice", label: "Sales Invoice", icon: FileText },
      { to: "/sales-return", label: "Sales Return", icon: Undo2 },
    ],
  },
  {
    key: "purchase",
    label: "Purchase",
    icon: ShoppingCart,
    items: [
      { to: "/purchase-invoice", label: "Purchase Invoice", icon: FileInput },
      { to: "/purchase-return", label: "Purchase Return", icon: Undo2 },
    ],
  },
  {
    key: "accounts",
    label: "Accounts",
    icon: Receipt,
    items: [
      { to: "/payment-voucher", label: "Payment Voucher", icon: CreditCard },
      { to: "/receipt-voucher", label: "Receipt Voucher", icon: Wallet },
      { to: "/journal-voucher", label: "Journal Voucher", icon: PenLine },
      { to: "/contra-voucher", label: "Contra Voucher", icon: ArrowLeftRight },
    ],
  },
  {
    key: "books",
    label: "Books & Ledgers",
    icon: BookOpen,
    items: [
      { to: "/customer-ledger", label: "Customer Ledger", icon: BookMarked },
      { to: "/vendor-ledger", label: "Vendor Ledger", icon: BookMarked },
      { to: "/cash-book", label: "Cash Book", icon: Banknote },
      { to: "/bank-book", label: "Bank Book", icon: Building2 },
      { to: "/day-book", label: "Day Book", icon: CalendarDays },
    ],
  },
  {
    key: "reports",
    label: "Reports & GST",
    icon: BarChart3,
    items: [
      { to: "/reports-dashboard", label: "Reports Overview", icon: PieChart },
      { to: "/sales-report", label: "Sales Report", icon: TrendingUp },
      { to: "/purchase-report", label: "Purchase Report", icon: ShoppingCart },
      { to: "/stock-report", label: "Stock Report", icon: PackageSearch },
      { to: "/profit-report", label: "Profit & Loss", icon: BarChart3 },
      { to: "/outstanding-report", label: "Outstanding Report", icon: AlertCircle },
      { to: "/compliance-dashboard", label: "GST Compliance", icon: Shield },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    items: [
      { to: "/company-settings", label: "Company Settings", icon: Building },
      { to: "/user-management", label: "User Management", icon: UserCog },
      { to: "/role-management", label: "Role Management", icon: ShieldCheck },
      { to: "/backup-restore", label: "Backup & Restore", icon: HardDrive },
      { to: "/pricing", label: "Pricing Plans", icon: CreditCard },
      { to: "/checkout-test", label: "Checkout Test", icon: CreditCard },
    ],
  },
];

/**
 * Primary ERP navigation rail with route-synced collapsible modules
 * and understated footer logout action.
 */
function Sidebar() {
  const user = useStore((state) => state.user);
  const branches = useStore((state) => state.branches);
  const activeBranchId = useStore((state) => state.activeBranchId);
  const setActiveBranch = useStore((state) => state.setActiveBranch);
  const logout = useStore((state) => state.logout);
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);
  const canSwitchBranch = user?.role === "SUPER_ADMIN" || user?.role === "COMPANY_ADMIN";
  const currentBranch =
    branches.find((b) => String(b.id) === String(activeBranchId)) ||
    branches.find((b) => String(b.id) === String(user?.branchId)) ||
    branches[0];
  const location = useLocation();
  const pathname = location.pathname;

  const activeSection = useMemo(() => getActiveSection(pathname), [pathname]);
  const [groupOverrides, setGroupOverrides] = useState({});

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  const isSectionOpen = (key) => groupOverrides[key] ?? activeSection === key;
  const toggleSection = (key) => {
    setGroupOverrides((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? activeSection === key),
    }));
  };

  const linkClass = (path) => {
    const isActive = pathname === path;
    return `relative flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors duration-150 cursor-pointer erp-focus-ring ${
      isActive
        ? "bg-primary/10 text-primary-text font-semibold before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-primary"
        : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground font-medium"
    }`;
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-[1px] z-40 lg:hidden transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSidebarOpen(false);
        }}
      />

      <aside
        aria-label="Primary Navigation"
        className={`fixed inset-y-0 left-0 w-60 xl:w-64 bg-sidebar border-r border-border z-50 transform transition-transform duration-200 ease-[var(--ease-drawer)] flex flex-col justify-between text-foreground no-print overscroll-contain lg:sticky lg:top-0 lg:self-start lg:h-dvh lg:inset-auto lg:z-auto lg:translate-x-0 shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header Logo */}
        <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0">
          <Link to="/" className="rounded-md erp-focus-ring">
            <BrandLogo size={34} showText={true} />
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground erp-focus-ring cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Mobile Branch Context Switcher (< 768px where topbar selector is hidden) */}
        {branches.length > 0 && (
          <div className="md:hidden px-3 py-2.5 border-b border-border bg-secondary/35 shrink-0">
            <label htmlFor="mobile-active-branch" className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Active Branch
            </label>
            <div className="flex items-center gap-2 h-9 px-2.5 rounded-md border border-border bg-input-bg text-xs text-foreground">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              {canSwitchBranch ? (
                <select
                  id="mobile-active-branch"
                  aria-label="Mobile Active Branch"
                  value={activeBranchId || currentBranch?.id || ""}
                  onChange={(e) => setActiveBranch(Number(e.target.value))}
                  className="bg-transparent w-full text-xs font-medium text-foreground erp-focus-ring rounded cursor-pointer"
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id} className="bg-card text-foreground">
                      {branch.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="font-medium truncate">{currentBranch?.name || "Main Branch"}</span>
              )}
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin">
          <Link to="/" className={linkClass("/")}>
            <NavIcon icon={LayoutDashboard} />
            <span>Dashboard</span>
          </Link>

          <div className="pt-2 space-y-0.5">
            {NAV_SECTIONS.map((section) => {
              const open = isSectionOpen(section.key);
              const containsActive = activeSection === section.key;

              return (
                <div key={section.key} className="pt-0.5">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => toggleSection(section.key)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer erp-focus-ring ${
                      containsActive
                        ? "text-foreground bg-secondary/50"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <NavIcon icon={section.icon} />
                      <span className="truncate">{section.label}</span>
                    </div>
                    <NavIcon
                      icon={ChevronDown}
                      className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-150 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {open && (
                    <div className="mt-0.5 ml-3 pl-2.5 border-l border-border/80 space-y-0.5 py-0.5">
                      {section.items.map((item) => (
                        <Link key={item.to} to={item.to} className={linkClass(item.to)}>
                          <NavIcon icon={item.icon} isSubLink />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Understated Logout Footer */}
        <div className="p-3 border-t border-border shrink-0">
          <button
            type="button"
            onClick={logout}
            className="w-full h-9 flex items-center justify-between px-3 rounded-md border border-border bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-xs font-medium text-muted-foreground erp-focus-ring transition-colors cursor-pointer"
          >
            <span>Sign out of workspace</span>
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
