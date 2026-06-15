import { useState, useEffect, useCallback } from "react";
import { useStore } from "../../store/useStore";
import TableWrapper from "../../components/common/TableWrapper";
import api from "../../utils/api";

function SalesReport() {
    const customers = useStore((state) => state.customers);
    const fetchCustomers = useStore((state) => state.fetchCustomers);

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [customerId, setCustomerId] = useState("");

    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadSalesReport = useCallback(async () => {
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
    }, [customerId, fromDate, toDate]);

    useEffect(() => {
        fetchCustomers().catch((err) => console.error("Failed to fetch customers:", err));
        const timer = setTimeout(() => {
            loadSalesReport();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchCustomers, loadSalesReport]);

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
        <div className="space-y-6 text-foreground">
            <h1 className="text-3xl font-bold mb-6 text-foreground">
                Sales Report
            </h1>

            {/* Filters */}
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full"
                    />

                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full"
                    />

                    <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer w-full"
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
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg cursor-pointer transition shadow-sm w-full"
                    >
                        Search
                    </button>
                </div>
            </div>

            {loading && (
                <div className="text-center mt-6 text-muted-foreground font-semibold flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Loading sales report...</span>
                </div>
            )}

            {!loading && (
                <>
                    {/* Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Sales</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">
                                ₹ {totalSales.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Invoices</p>
                            <p className="text-2xl font-bold text-primary mt-1">
                                {totalInvoices}
                            </p>
                        </div>

                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Average Invoice Value</p>
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                                ₹ {averageInvoiceValue.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Table */}
                    <TableWrapper className="mt-6">
                        <table className="w-full text-sm">
                            <thead className="bg-secondary/40 text-muted-foreground border-b border-border">
                                <tr>
                                    <th className="p-4 text-left font-semibold">Invoice No</th>
                                    <th className="p-4 text-left font-semibold">Date</th>
                                    <th className="p-4 text-left font-semibold">Customer</th>
                                    <th className="p-4 text-center font-semibold">Qty</th>
                                    <th className="p-4 text-right font-semibold">Amount</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-border">
                                {salesData.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-secondary/20 transition-colors duration-150">
                                        <td className="p-4 font-mono font-semibold text-foreground">{sale.invoiceNo}</td>
                                        <td className="p-4 text-muted-foreground">{sale.invoiceDate.split("T")[0]}</td>
                                        <td className="p-4 text-left text-foreground font-medium">{sale.customer?.name}</td>
                                        <td className="p-4 text-center text-foreground">{sale.totalQty}</td>
                                        <td className="p-4 text-right font-mono font-bold text-foreground">₹ {sale.grandTotal.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {salesData.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-muted-foreground font-medium">
                                            No sales invoices found for this period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </TableWrapper>
                </>
            )}
        </div>
    );
}

export default SalesReport;