import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useStore } from "../store/useStore";

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
        if (["/company-settings", "/user-management", "/role-management", "/backup-restore"].includes(pathname)) {
            setSettings(true);
        }
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

    const headerClass = (isOpen) =>
        `w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer hover:bg-secondary text-foreground`;

    return (
        <div className="w-64 glass-panel-blur min-h-screen p-5 flex flex-col justify-between border-r border-border text-foreground no-print shadow-xl">
            <div>
                {/* Brand Logo */}
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                        <span className="text-primary-foreground font-black text-lg">G</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Groww You ERP
                    </h1>
                </div>

                {/* Navigation Items */}
                <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-180px)] pr-1 scrollbar-thin">
                    
                    {/* Dashboard */}
                    <Link to="/" className={linkClass("/")}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                        </svg>
                        <span>Dashboard</span>
                    </Link>

                    {/* Masters Section */}
                    <div>
                        <button onClick={() => setMasters(!masters)} className={headerClass(masters)}>
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                <span>Masters</span>
                            </div>
                            <svg className={`w-4 h-4 transition-transform duration-200 ${masters ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${masters ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                            <Link to="/customers" className={linkClass("/customers")}>Customer Master</Link>
                            <Link to="/vendors" className={linkClass("/vendors")}>Vendor Master</Link>
                            <Link to="/inventory" className={linkClass("/inventory")}>Item Master</Link>
                        </div>
                    </div>

                    {/* Sales Section */}
                    <div>
                        <button onClick={() => setSales(!sales)} className={headerClass(sales)}>
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Sales</span>
                            </div>
                            <svg className={`w-4 h-4 transition-transform duration-200 ${sales ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${sales ? "max-h-32 opacity-100" : "max-h-0 opacity-0"}`}>
                            <Link to="/sales-invoice" className={linkClass("/sales-invoice")}>Sales Invoice</Link>
                            <Link to="/sales-return" className={linkClass("/sales-return")}>Sales Return</Link>
                        </div>
                    </div>

                    {/* Purchase Section */}
                    <div>
                        <button onClick={() => setPurchase(!purchase)} className={headerClass(purchase)}>
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>Purchase</span>
                            </div>
                            <svg className={`w-4 h-4 transition-transform duration-200 ${purchase ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${purchase ? "max-h-32 opacity-100" : "max-h-0 opacity-0"}`}>
                            <Link to="/purchase-invoice" className={linkClass("/purchase-invoice")}>Purchase Invoice</Link>
                            <Link to="/purchase-return" className={linkClass("/purchase-return")}>Purchase Return</Link>
                        </div>
                    </div>

                    {/* Accounts Section */}
                    <div>
                        <button onClick={() => setAccounts(!accounts)} className={headerClass(accounts)}>
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Accounts</span>
                            </div>
                            <svg className={`w-4 h-4 transition-transform duration-200 ${accounts ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${accounts ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}>
                            <Link to="/payment-voucher" className={linkClass("/payment-voucher")}>Payment Voucher</Link>
                            <Link to="/receipt-voucher" className={linkClass("/receipt-voucher")}>Receipt Voucher</Link>
                            <Link to="/journal-voucher" className={linkClass("/journal-voucher")}>Journal Voucher</Link>
                            <Link to="/contra-voucher" className={linkClass("/contra-voucher")}>Contra Voucher</Link>
                        </div>
                    </div>

                    {/* Books Section */}
                    <div>
                        <button onClick={() => setBooks(!books)} className={headerClass(books)}>
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <span>Books</span>
                            </div>
                            <svg className={`w-4 h-4 transition-transform duration-200 ${books ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${books ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`}>
                            <Link to="/customer-ledger" className={linkClass("/customer-ledger")}>Customer Ledger</Link>
                            <Link to="/vendor-ledger" className={linkClass("/vendor-ledger")}>Vendor Ledger</Link>
                            <Link to="/cash-book" className={linkClass("/cash-book")}>Cash Book</Link>
                            <Link to="/bank-book" className={linkClass("/bank-book")}>Bank Book</Link>
                            <Link to="/day-book" className={linkClass("/day-book")}>Day Book</Link>
                        </div>
                    </div>

                    {/* Reports Section */}
                    <div>
                        <button onClick={() => setReports(!reports)} className={headerClass(reports)}>
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                                </svg>
                                <span>Reports</span>
                            </div>
                            <svg className={`w-4 h-4 transition-transform duration-200 ${reports ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${reports ? "max-h-72 opacity-100" : "max-h-0 opacity-0"}`}>
                            <Link to="/reports-dashboard" className={linkClass("/reports-dashboard")}>Reports Dashboard</Link>
                            <Link to="/sales-report" className={linkClass("/sales-report")}>Sales Report</Link>
                            <Link to="/purchase-report" className={linkClass("/purchase-report")}>Purchase Report</Link>
                            <Link to="/stock-report" className={linkClass("/stock-report")}>Stock Report</Link>
                            <Link to="/outstanding-report" className={linkClass("/outstanding-report")}>Outstanding Report</Link>
                            <Link to="/compliance-dashboard" className={linkClass("/compliance-dashboard")}>Compliance Dashboard</Link>
                        </div>
                    </div>

                    {/* Settings Section */}
                    <div>
                        <button onClick={() => setSettings(!settings)} className={headerClass(settings)}>
                            <div className="flex items-center gap-3">
                                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>Settings</span>
                            </div>
                            <svg className={`w-4 h-4 transition-transform duration-200 ${settings ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className={`ml-4 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${settings ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}>
                            <Link to="/company-settings" className={linkClass("/company-settings")}>Company Settings</Link>
                            <Link to="/user-management" className={linkClass("/user-management")}>User Management</Link>
                            <Link to="/backup-restore" className={linkClass("/backup-restore")}>Backup & Restore</Link>
                            <Link to="/role-management" className={linkClass("/role-management")}>Role Management</Link>
                        </div>
                    </div>

                </div>
            </div>

            {/* Logout Button */}
            <div className="pt-4 border-t border-border mt-auto">
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-semibold shadow-lg shadow-destructive/10 transition-all duration-200 cursor-pointer active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
}

export default Sidebar;