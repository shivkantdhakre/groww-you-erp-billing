import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

function ReportsDashboard() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSummary();
    }, []);

    const loadSummary = async () => {
        setLoading(true);
        try {
            const res = await api.get("/reports/summary");
            setSummary(res.data);
        } catch (err) {
            console.error("Failed to load reports summary:", err);
        } finally {
            setLoading(false);
        }
    };

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
        <div>
            <h1 className="text-3xl font-bold mb-6">
                Reports Dashboard
            </h1>

            {loading && (
                <div className="text-center text-gray-500 font-semibold mb-6">
                    Loading dashboard statistics...
                </div>
            )}

            {/* Report Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {reports.map((report, index) => (
                    <div
                        key={index}
                        className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition"
                    >
                        <h2 className="text-gray-500">
                            {report.title}
                        </h2>

                        <p className="text-2xl font-bold mt-2 text-blue-600">
                            {report.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-5 rounded-xl shadow mt-6">
                <h2 className="text-2xl font-bold mb-4">
                    Quick Report Actions
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => navigate("/sales-report")}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg cursor-pointer font-medium transition-colors"
                    >
                        Generate Sales Report
                    </button>

                    <button
                        onClick={() => navigate("/purchase-report")}
                        className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg cursor-pointer font-medium transition-colors"
                    >
                        Generate Purchase Report
                    </button>

                    <button
                        onClick={() => navigate("/stock-report")}
                        className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg cursor-pointer font-medium transition-colors"
                    >
                        Generate Stock Report
                    </button>
                </div>
            </div>

            {/* Recent Reports */}
            <div className="bg-white p-5 rounded-xl shadow mt-6">
                <h2 className="text-2xl font-bold mb-4">
                    Recent Reports
                </h2>

                <table className="w-full text-center">
                    <thead className="bg-blue-600 text-white">
                        <tr>
                            <th className="p-3 text-left">
                                Report Name
                            </th>
                            <th className="p-3">
                                Action
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr className="border-t">
                            <td className="p-3 text-left">
                                Sales Report
                            </td>
                            <td className="p-3">
                                <button
                                    onClick={() => navigate("/sales-report")}
                                    className="text-blue-600 hover:underline cursor-pointer font-medium"
                                >
                                    View Report
                                </button>
                            </td>
                        </tr>

                        <tr className="border-t">
                            <td className="p-3 text-left">
                                Purchase Report
                            </td>
                            <td className="p-3">
                                <button
                                    onClick={() => navigate("/purchase-report")}
                                    className="text-blue-600 hover:underline cursor-pointer font-medium"
                                >
                                    View Report
                                </button>
                            </td>
                        </tr>

                        <tr className="border-t">
                            <td className="p-3 text-left">
                                Stock Report
                            </td>
                            <td className="p-3">
                                <button
                                    onClick={() => navigate("/stock-report")}
                                    className="text-blue-600 hover:underline cursor-pointer font-medium"
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