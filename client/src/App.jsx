import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { useStore } from "./store/useStore";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Breadcrumb from "./components/Breadcrumb";

import Dashboard from "./pages/Dashboard";
import Customers from "./pages/masters/Customers";
import Vendors from "./pages/masters/Vendors";
import Inventory from "./pages/masters/Inventory";
import Leads from "./pages/crm/Leads";
import Login from "./pages/Login";

import SalesInvoice from "./pages/sales/SalesInvoice";
import SalesReturn from "./pages/sales/SalesReturn";

import PurchaseInvoice from "./pages/purchase/PurchaseInvoice";
import PurchaseReturn from "./pages/purchase/PurchaseReturn";

import VendorLedger from "./pages/books/VendorLedger";
import CustomerLedger from "./pages/books/CustomerLedger";

import SalesReport from "./pages/reports/SalesReport";
import PurchaseReport from "./pages/reports/PurchaseReport";
import ProfitReport from "./pages/reports/ProfitReport";
import ReportsDashboard from "./pages/ReportsDashboard";

import PaymentVoucher from "./pages/accounts/PaymentVoucher";
import ReceiptVoucher from "./pages/accounts/ReceiptVoucher";
import CashBook from "./pages/books/CashBook";
import BankBook from "./pages/books/BankBook";
import DayBook from "./pages/books/DayBook";
import JournalVoucher from "./pages/accounts/JournalVoucher";
import ContraVoucher from "./pages/accounts/ContraVoucher";

import StockReport from "./pages/reports/StockReport";
import OutstandingReport from "./pages/reports/OutstandingReport";
import ComplianceDashboard from "./pages/reports/ComplianceDashboard";
import CompanySettings from "./pages/settings/CompanySettings";
import UserManagement from "./pages/settings/UserManagement";
import RoleManagement from "./pages/settings/RoleManagement";
import BackupRestore from "./pages/settings/BackupRestore";
import ProfileSettings from "./pages/settings/ProfileSettings";
import PricingPlans from "./pages/settings/PricingPlans";
import RazorpayCheckoutTest from "./pages/settings/RazorpayCheckoutTest";
import SalesInvoicePrint from "./pages/print/SalesInvoicePrint";
import PurchaseInvoicePrint from "./pages/print/PurchaseInvoicePrint";
import PaymentVoucherPrint from "./pages/print/PaymentVoucherPrint";
import ReceiptVoucherPrint from "./pages/print/ReceiptVoucherPrint";
import ThermalInvoicePrint from "./pages/print/ThermalInvoicePrint";

function AppContent() {
  const location = useLocation();
  const isPrintPage = location.pathname.startsWith("/print");
  const user = useStore((state) => state.user);
  const activeBranchId = useStore((state) => state.activeBranchId);
  const subscription = user?.subscription;

  const routes = (
    <Routes>
      <Route path="/" element={<Dashboard />} />

      <Route path="/customers" element={<Customers />} />
      <Route path="/leads" element={<Leads />} />
      <Route path="/vendors" element={<Vendors />} />
      <Route path="/inventory" element={<Inventory />} />

      <Route path="/sales-invoice" element={<SalesInvoice />} />
      <Route path="/sales-return" element={<SalesReturn />} />

      <Route path="/purchase-invoice" element={<PurchaseInvoice />} />
      <Route path="/purchase-return" element={<PurchaseReturn />} />

      <Route path="/payment-voucher" element={<PaymentVoucher />} />
      <Route path="/receipt-voucher" element={<ReceiptVoucher />} />

      <Route path="/reports-dashboard" element={<ReportsDashboard />} />
      <Route path="/sales-report" element={<SalesReport />} />
      <Route path="/purchase-report" element={<PurchaseReport />} />
      <Route path="/profit-report" element={<ProfitReport />} />
      <Route path="/vendor-ledger" element={<VendorLedger />} />
      <Route path="/customer-ledger" element={<CustomerLedger />} />
      <Route path="/cash-book" element={<CashBook />} />
      <Route path="/bank-book" element={<BankBook />} />
      <Route path="/day-book" element={<DayBook />} />
      <Route path="/journal-voucher" element={<JournalVoucher />} />
      <Route path="/contra-voucher" element={<ContraVoucher />} />
      <Route path="/stock-report" element={<StockReport />} />
      <Route path="/outstanding-report" element={<OutstandingReport />} />
      <Route path="/compliance-dashboard" element={<ComplianceDashboard />} />
      <Route path="/company-settings" element={<CompanySettings />} />
      <Route path="/user-management" element={<UserManagement />} />
      <Route path="/profile-settings" element={<ProfileSettings />} />
      <Route path="/role-management" element={<RoleManagement />} />
      <Route path="/backup-restore" element={<BackupRestore />} />
      <Route path="/pricing" element={<PricingPlans />} />
      <Route path="/checkout-test" element={<RazorpayCheckoutTest />} />
      
      {/* Print Templates */}
      <Route path="/print/sales-invoice" element={<SalesInvoicePrint />} />
      <Route path="/print/sales-invoice/:id" element={<SalesInvoicePrint />} />
      <Route path="/print/purchase-invoice" element={<PurchaseInvoicePrint />} />
      <Route path="/print/purchase-invoice/:id" element={<PurchaseInvoicePrint />} />
      <Route path="/print/payment-voucher" element={<PaymentVoucherPrint />} />
      <Route path="/print/payment-voucher/:id" element={<PaymentVoucherPrint />} />
      <Route path="/print/receipt-voucher" element={<ReceiptVoucherPrint />} />
      <Route path="/print/receipt-voucher/:id" element={<ReceiptVoucherPrint />} />
      <Route path="/print/thermal-invoice/:id" element={<ThermalInvoicePrint />} />

      <Route path="/login" element={<Navigate to="/" replace />} />
    </Routes>
  );

  if (isPrintPage) {
    return routes;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {subscription?.status === "PAST_DUE" && (
          <div className="bg-warning/15 text-warning border-b border-warning/30 px-4 sm:px-6 py-2 text-center text-xs sm:text-sm font-medium flex flex-wrap justify-center items-center gap-2 no-print shrink-0">
            <span>Subscription payment renewal is past due. Update billing to avoid service interruption.</span>
            <Link to="/pricing" className="underline hover:opacity-80 transition font-semibold">
              Update Payment Details &rarr;
            </Link>
          </div>
        )}
        <Navbar />
        <main
          key={activeBranchId || "default"}
          className="p-4 sm:p-6 flex-1 overflow-y-auto w-full max-w-[1600px] mx-auto"
        >
          <Breadcrumb />
          {routes}
        </main>
      </div>
    </div>
  );
}

function App() {
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);

  // Synchronize token and user authentication state consistency
  useEffect(() => {
    if (!!token !== !!user) {
      logout();
    }
  }, [token, user, logout]);

  // Subscription state synchronization (window focus/mount)
  useEffect(() => {
    if (token && user) {
      const { verifyStatus } = useStore.getState();
      verifyStatus().catch(() => {});

      const handleFocus = () => {
        verifyStatus().catch(() => {});
      };
      window.addEventListener("focus", handleFocus);
      return () => {
        window.removeEventListener("focus", handleFocus);
      };
    }
  }, [token, user]);

  if (!token || !user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;