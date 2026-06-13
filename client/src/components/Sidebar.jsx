import { useState, useEffect } from "react";
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
    ShieldCheck
} from "lucide-react";

// Lightweight helper to render navigation icons with layout/accessibility defaults
function NavIcon({ icon: Icon, isSubLink = false, ...props }) {
    if (!Icon) return null;
    return (
        <Icon
            className={`${isSubLink ? "w-4 h-4" : "w-5 h-5"} shrink-0`}
            strokeWidth={isSubLink ? 1.5 : 2}
            aria-hidden="true"
            {...props}
        />
    );
}

function Sidebar() {
    const logout = useStore((state) => state.logout);
    const location = useLocation();
    const pathname = location.pathname;

    // Collapsible states
    const [masters, setMasters] = useState(false);
    const [sales, setSales] = useState(false);
    const [purchase, setPurchase] = useState(false);
    const [accounts, setAccounts] = useState(false);
    const [books, setBooks] = useState(false);
    const [reports, setReports] = useState(false);
    const [settings, setSettings] = useState(false);

    // Auto-open active categories on route change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (["/customers", "/vendors", "/inventory"].includes(pathname)) {
                setMasters(true);
            }
            if (["/sales-invoice", "/sales-return"].includes(pathname)) {
                setSales(true);
            }
            if (["/purchase-invoice", "/purchase-return"].includes(pathname)) {
                setPurchase(true);
            }
            if (["/payment-voucher", "/receipt-voucher", "/journal-voucher", "/contra-voucher"].includes(pathname)) {
                setAccounts(true);
            }
            if (["/customer-ledger", "/vendor-ledger", "/cash-book", "/bank-book", "/day-book"].includes(pathname)) {
                setBooks(true);
            }
            if (["/reports-dashboard", "/sales-report", "/purchase-report", "/stock-report", "/outstanding-report", "/compliance-dashboard"].includes(pathname)) {
                setReports(true);
            }
            if (["/company-settings", "/user-management", "/role-management", "/backup-restore", "/pricing"].includes(pathname)) {
                setSettings(true);
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [pathname]);

    // Helpers to style links
    const isLinkActive = (path) => pathname === path;
    const linkClass = (path) => {
        const isActive = isLinkActive(path);
        return `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
            isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground hover:translate-x-1"
        }`;
    };

    const headerClass = () =>
        `w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer hover:bg-secondary text-foreground`;

    return (
        <div className="w-64 glass-panel-blur h-screen sticky top-0 self-start p-5 flex flex-col justify-between border-r border-border text-foreground no-print shadow-xl">
            <div className="flex flex-col flex-1 min-h-0">
                {/* Brand Logo */}
                <div className="flex items-center gap-3 mb-8 px-2 shrink-0">
                    <BrandLogo size={34} showText={true} />
                </div>

                {/* Navigation Items */}
                <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1 scrollbar-thin">
                    
                    {/* Dashboard */}
                    <Link to="/" className={linkClass("/")}>
                        <NavIcon icon={LayoutDashboard} />
                        <span>Dashboard</span>
                    </Link>

                    {/* Masters Section */}
                    <div>
                        <button onClick={() => setMasters(!masters)} className={headerClass()}>
                            <div className="flex items-center gap-3">
                                <NavIcon icon={Database} className="text-muted-foreground" />
                                <span>Masters</span>
                            </div>
                            <NavIcon icon={ChevronDown} className={`w-4 h-4 transition-transform duration-200 ${masters ? "rotate-180" : ""}`} />
                        </button>
                        <div className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${masters ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`}>
                            <Link to="/customers" className={linkClass("/customers")}>
                                <NavIcon icon={Users} isSubLink />
                                <span>Customer Master</span>
                            </Link>
                            <Link to="/vendors" className={linkClass("/vendors")}>
                                <NavIcon icon={Truck} isSubLink />
                                <span>Vendor Master</span>
                            </Link>
                            <Link to="/inventory" className={linkClass("/inventory")}>
                                <NavIcon icon={Package} isSubLink />
                                <span>Item Master</span>
                            </Link>
                        </div>
                    </div>

                    {/* Sales Section */}
                    <div>
                        <button onClick={() => setSales(!sales)} className={headerClass()}>
                            <div className="flex items-center gap-3">
                                <NavIcon icon={TrendingUp} className="text-muted-foreground" />
                                <span>Sales</span>
                            </div>
                            <NavIcon icon={ChevronDown} className={`w-4 h-4 transition-transform duration-200 ${sales ? "rotate-180" : ""}`} />
                        </button>
                        <div className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${sales ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}>
                            <Link to="/sales-invoice" className={linkClass("/sales-invoice")}>
                                <NavIcon icon={FileText} isSubLink />
                                <span>Sales Invoice</span>
                            </Link>
                            <Link to="/sales-return" className={linkClass("/sales-return")}>
                                <NavIcon icon={Undo2} isSubLink />
                                <span>Sales Return</span>
                            </Link>
                        </div>
                    </div>

                    {/* Purchase Section */}
                    <div>
                        <button onClick={() => setPurchase(!purchase)} className={headerClass()}>
                            <div className="flex items-center gap-3">
                                <NavIcon icon={ShoppingCart} className="text-muted-foreground" />
                                <span>Purchase</span>
                            </div>
                            <NavIcon icon={ChevronDown} className={`w-4 h-4 transition-transform duration-200 ${purchase ? "rotate-180" : ""}`} />
                        </button>
                        <div className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${purchase ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}>
                            <Link to="/purchase-invoice" className={linkClass("/purchase-invoice")}>
                                <NavIcon icon={FileInput} isSubLink />
                                <span>Purchase Invoice</span>
                            </Link>
                            <Link to="/purchase-return" className={linkClass("/purchase-return")}>
                                <NavIcon icon={Undo2} isSubLink />
                                <span>Purchase Return</span>
                            </Link>
                        </div>
                    </div>

                    {/* Accounts Section */}
                    <div>
                        <button onClick={() => setAccounts(!accounts)} className={headerClass()}>
                            <div className="flex items-center gap-3">
                                <NavIcon icon={Receipt} className="text-muted-foreground" />
                                <span>Accounts</span>
                            </div>
                            <NavIcon icon={ChevronDown} className={`w-4 h-4 transition-transform duration-200 ${accounts ? "rotate-180" : ""}`} />
                        </button>
                        <div className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${accounts ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}`}>
                            <Link to="/payment-voucher" className={linkClass("/payment-voucher")}>
                                <NavIcon icon={CreditCard} isSubLink />
                                <span>Payment Voucher</span>
                            </Link>
                            <Link to="/receipt-voucher" className={linkClass("/receipt-voucher")}>
                                <NavIcon icon={Wallet} isSubLink />
                                <span>Receipt Voucher</span>
                            </Link>
                            <Link to="/journal-voucher" className={linkClass("/journal-voucher")}>
                                <NavIcon icon={PenLine} isSubLink />
                                <span>Journal Voucher</span>
                            </Link>
                            <Link to="/contra-voucher" className={linkClass("/contra-voucher")}>
                                <NavIcon icon={ArrowLeftRight} isSubLink />
                                <span>Contra Voucher</span>
                            </Link>
                        </div>
                    </div>

                    {/* Books Section */}
                    <div>
                        <button onClick={() => setBooks(!books)} className={headerClass()}>
                            <div className="flex items-center gap-3">
                                <NavIcon icon={BookOpen} className="text-muted-foreground" />
                                <span>Books</span>
                            </div>
                            <NavIcon icon={ChevronDown} className={`w-4 h-4 transition-transform duration-200 ${books ? "rotate-180" : ""}`} />
                        </button>
                        <div className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${books ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                            <Link to="/customer-ledger" className={linkClass("/customer-ledger")}>
                                <NavIcon icon={BookMarked} isSubLink />
                                <span>Customer Ledger</span>
                            </Link>
                            <Link to="/vendor-ledger" className={linkClass("/vendor-ledger")}>
                                <NavIcon icon={BookMarked} isSubLink />
                                <span>Vendor Ledger</span>
                            </Link>
                            <Link to="/cash-book" className={linkClass("/cash-book")}>
                                <NavIcon icon={Banknote} isSubLink />
                                <span>Cash Book</span>
                            </Link>
                            <Link to="/bank-book" className={linkClass("/bank-book")}>
                                <NavIcon icon={Building2} isSubLink />
                                <span>Bank Book</span>
                            </Link>
                            <Link to="/day-book" className={linkClass("/day-book")}>
                                <NavIcon icon={CalendarDays} isSubLink />
                                <span>Day Book</span>
                            </Link>
                        </div>
                    </div>

                    {/* Reports Section */}
                    <div>
                        <button onClick={() => setReports(!reports)} className={headerClass()}>
                            <div className="flex items-center gap-3">
                                <NavIcon icon={BarChart3} className="text-muted-foreground" />
                                <span>Reports</span>
                            </div>
                            <NavIcon icon={ChevronDown} className={`w-4 h-4 transition-transform duration-200 ${reports ? "rotate-180" : ""}`} />
                        </button>
                        <div className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${reports ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"}`}>
                            <Link to="/reports-dashboard" className={linkClass("/reports-dashboard")}>
                                <NavIcon icon={PieChart} isSubLink />
                                <span>Reports Dashboard</span>
                            </Link>
                            <Link to="/sales-report" className={linkClass("/sales-report")}>
                                <NavIcon icon={TrendingUp} isSubLink />
                                <span>Sales Report</span>
                            </Link>
                            <Link to="/purchase-report" className={linkClass("/purchase-report")}>
                                <NavIcon icon={ShoppingCart} isSubLink />
                                <span>Purchase Report</span>
                            </Link>
                            <Link to="/stock-report" className={linkClass("/stock-report")}>
                                <NavIcon icon={PackageSearch} isSubLink />
                                <span>Stock Report</span>
                            </Link>
                            <Link to="/outstanding-report" className={linkClass("/outstanding-report")}>
                                <NavIcon icon={AlertCircle} isSubLink />
                                <span>Outstanding Report</span>
                            </Link>
                            <Link to="/compliance-dashboard" className={linkClass("/compliance-dashboard")}>
                                <NavIcon icon={Shield} isSubLink />
                                <span>Compliance Dashboard</span>
                            </Link>
                        </div>
                    </div>

                    {/* Settings Section */}
                    <div>
                        <button onClick={() => setSettings(!settings)} className={headerClass()}>
                            <div className="flex items-center gap-3">
                                <NavIcon icon={Settings} className="text-muted-foreground" />
                                <span>Settings</span>
                            </div>
                            <NavIcon icon={ChevronDown} className={`w-4 h-4 transition-transform duration-200 ${settings ? "rotate-180" : ""}`} />
                        </button>
                        <div className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${settings ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}`}>
                            <Link to="/company-settings" className={linkClass("/company-settings")}>
                                <NavIcon icon={Building} isSubLink />
                                <span>Company Settings</span>
                            </Link>
                            <Link to="/user-management" className={linkClass("/user-management")}>
                                <NavIcon icon={UserCog} isSubLink />
                                <span>User Management</span>
                            </Link>
                            <Link to="/backup-restore" className={linkClass("/backup-restore")}>
                                <NavIcon icon={HardDrive} isSubLink />
                                <span>Backup & Restore</span>
                            </Link>
                            <Link to="/role-management" className={linkClass("/role-management")}>
                                <NavIcon icon={ShieldCheck} isSubLink />
                                <span>Role Management</span>
                            </Link>
                            <Link to="/pricing" className={linkClass("/pricing")}>
                                <NavIcon icon={CreditCard} isSubLink />
                                <span>Pricing Plans</span>
                            </Link>
                        </div>
                    </div>

                </div>
            </div>

            {/* Logout Button */}
            <div className="pt-4 border-t border-border mt-auto shrink-0">
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-semibold shadow-lg shadow-destructive/10 transition-all duration-200 cursor-pointer active:scale-95"
                >
                    <NavIcon icon={LogOut} />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
}

export default Sidebar;