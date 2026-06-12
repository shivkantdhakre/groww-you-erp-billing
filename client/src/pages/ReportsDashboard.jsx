import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

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

    const reports = [
        {
            title: "Total Sales",
            value: summary ? `₹ ${summary.totalSales.toFixed(2)}` : "₹ 0.00",
        },
        {
            title: "Total Purchases",
            value: summary ? `₹ ${summary.totalPurchases.toFixed(2)}` : "₹ 0.00",
        },
        {
            title: "Active Customers",
            value: summary ? String(summary.activeCustomersCount) : "0",
        },
        {
            title: "Active Vendors",
            value: summary ? String(summary.activeVendorsCount) : "0",
        },
        {
            title: "Low Stock Items",
            value: summary ? `${summary.lowStockItemsCount} Items` : "0 Items",
        },
    ];

    return (
        <div className="space-y-6 text-foreground">
            <h1 className="text-3xl font-bold mb-6 text-foreground">
                Reports Dashboard
            </h1>

            {loading && (
                <div className="text-center text-muted-foreground font-semibold mb-6 flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Loading dashboard statistics...</span>
                </div>
            )}

            {/* Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {reports.map((report, index) => (
                    <div
                        key={index}
                        className="bg-card p-5 rounded-xl border border-border shadow-sm hover:shadow-md transition duration-200"
                    >
                        <h2 className="text-muted-foreground text-sm font-semibold tracking-wide">
                            {report.title}
                        </h2>

                        <p className="text-2xl font-bold mt-2 text-primary">
                            {report.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm mt-6">
                <h2 className="text-2xl font-bold mb-4 text-foreground">
                    Quick Report Actions
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => navigate("/sales-report")}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground p-3 rounded-lg cursor-pointer font-medium transition-colors shadow-sm"
                    >
                        Generate Sales Report
                    </button>

                    <button
                        onClick={() => navigate("/purchase-report")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-lg cursor-pointer font-medium transition-colors shadow-sm"
                    >
                        Generate Purchase Report
                    </button>

                    <button
                        onClick={() => navigate("/stock-report")}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-lg cursor-pointer font-medium transition-colors shadow-sm"
                    >
                        Generate Stock Report
                    </button>
                </div>
            </div>

            {/* Recent Reports */}
            <div className="bg-card rounded-xl border border-border shadow-sm mt-6 overflow-hidden">
                <div className="p-5 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">
                        Recent Reports
                    </h2>
                </div>

                <table className="w-full text-sm">
                    <thead className="bg-secondary/40 text-muted-foreground border-b border-border">
                        <tr>
                            <th className="p-4 text-left font-semibold">
                                Report Name
                            </th>
                            <th className="p-4 text-center font-semibold">
                                Action
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                        <tr className="hover:bg-secondary/20 transition-colors duration-150">
                            <td className="p-4 text-left font-medium text-foreground">
                                Sales Report
                            </td>
                            <td className="p-4 text-center">
                                <button
                                    onClick={() => navigate("/sales-report")}
                                    className="text-primary hover:underline cursor-pointer font-medium"
                                >
                                    View Report
                                </button>
                            </td>
                        </tr>

                        <tr className="hover:bg-secondary/20 transition-colors duration-150">
                            <td className="p-4 text-left font-medium text-foreground">
                                Purchase Report
                            </td>
                            <td className="p-4 text-center">
                                <button
                                    onClick={() => navigate("/purchase-report")}
                                    className="text-primary hover:underline cursor-pointer font-medium"
                                >
                                    View Report
                                </button>
                            </td>
                        </tr>

                        <tr className="hover:bg-secondary/20 transition-colors duration-150">
                            <td className="p-4 text-left font-medium text-foreground">
                                Stock Report
                            </td>
                            <td className="p-4 text-center">
                                <button
                                    onClick={() => navigate("/stock-report")}
                                    className="text-primary hover:underline cursor-pointer font-medium"
                                >
                                    View Report
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ReportsDashboard;