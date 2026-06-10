import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";

function SalesReport() {
    const customers = useStore((state) => state.customers);
    const fetchCustomers = useStore((state) => state.fetchCustomers);

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [customerId, setCustomerId] = useState("");

    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCustomers();
        loadSalesReport();
    }, []);

    const loadSalesReport = async () => {
        setLoading(true);
        try {
            const res = await api.get(
                `/reports/sales?customerId=${customerId}&fromDate=${fromDate}&toDate=${toDate}`
            );
            setSalesData(res.data || []);
        } catch (err) {
            console.error("Failed to load sales report:", err);
            alert("Failed to load sales report");
        } finally {
            setLoading(false);
        }
    };

    const totalSales = salesData.reduce(
        (total, item) => total + item.grandTotal,
        0
    );

    const totalInvoices = salesData.length;

    const averageInvoiceValue =
        totalInvoices > 0
            ? Math.round(totalSales / totalInvoices)
            : 0;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">
                Sales Report
            </h1>

            {/* Filters */}
            <div className="bg-white p-5 rounded-xl shadow">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="border p-3 rounded-lg"
                    />

                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="border p-3 rounded-lg"
                    />

                    <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="border p-3 rounded-lg"
                    >
                        <option value="">
                            All Customers
                        </option>
                        {customers.filter(c => c.isActive).map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={loadSalesReport}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                    >
                        Search
                    </button>
                </div>
            </div>

            {loading && (
                <div className="text-center mt-6 text-gray-500 font-semibold">
                    Loading sales report...
                </div>
            )}

            {!loading && (
                <>
                    {/* Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-white p-5 rounded-xl shadow">
                            <p className="text-gray-500">Total Sales</p>
                            <p className="text-2xl font-bold text-green-600">
                                ₹ {totalSales.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow">
                            <p className="text-gray-500">Total Invoices</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {totalInvoices}
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow">
                            <p className="text-gray-500">Average Invoice Value</p>
                            <p className="text-2xl font-bold text-purple-600">
                                ₹ {averageInvoiceValue.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white p-5 rounded-xl shadow mt-6">
                        <table className="w-full text-center">
                            <thead className="bg-blue-600 text-white">
                                <tr>
                                    <th className="p-3">Invoice No</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Customer</th>
                                    <th className="p-3">Qty</th>
                                    <th className="p-3">Amount</th>
                                </tr>
                            </thead>

                            <tbody>
                                {salesData.map((sale) => (
                                    <tr key={sale.id} className="border-t">
                                        <td className="p-3">{sale.invoiceNo}</td>
                                        <td className="p-3">{sale.invoiceDate.split("T")[0]}</td>
                                        <td className="p-3 text-left">{sale.customer?.name}</td>
                                        <td className="p-3">{sale.totalQty}</td>
                                        <td className="p-3 font-semibold">₹ {sale.grandTotal.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {salesData.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-6 text-gray-500 text-center">
                                            No sales invoices found for this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

export default SalesReport;