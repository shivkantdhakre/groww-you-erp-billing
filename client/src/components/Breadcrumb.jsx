import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS = {
  "sales-invoice": "Sales Invoice",
  "sales-return": "Sales Return",
  "purchase-invoice": "Purchase Invoice",
  "purchase-return": "Purchase Return",
  "payment-voucher": "Payment Voucher",
  "receipt-voucher": "Receipt Voucher",
  "journal-voucher": "Journal Voucher",
  "contra-voucher": "Contra Voucher",
  "customer-ledger": "Customer Ledger",
  "vendor-ledger": "Vendor Ledger",
  "cash-book": "Cash Book",
  "bank-book": "Bank Book",
  "day-book": "Day Book",
  "reports-dashboard": "Reports Overview",
  "sales-report": "Sales Report",
  "purchase-report": "Purchase Report",
  "stock-report": "Stock Report",
  "profit-report": "Profit Report",
  "outstanding-report": "Outstanding Report",
  "compliance-dashboard": "GST Compliance",
  "company-settings": "Company Settings",
  "profile-settings": "Profile Settings",
  "user-management": "User Management",
  "role-management": "Role Management",
  "backup-restore": "Backup & Restore",
  pricing: "Pricing Plans",
  "checkout-test": "Checkout Verification",
  leads: "CRM & AI Leads",
};

function formatSegment(segment) {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment];
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Compact editorial breadcrumb trail hidden on root Dashboard view.
 */
function Breadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter(Boolean);

  if (pathnames.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
      <Link
        to="/"
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Dashboard</span>
      </Link>

      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const label = formatSegment(name);

        return (
          <span key={routeTo} className="inline-flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" aria-hidden="true" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link to={routeTo} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumb;
