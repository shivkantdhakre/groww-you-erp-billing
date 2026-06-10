import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";

function PurchaseReport() {
    const vendors = useStore((state) => state.vendors);
    const fetchVendors = useStore((state) => state.fetchVendors);

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [vendorId, setVendorId] = useState("");

    const [purchaseData, setPurchaseData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchVendors();
        loadPurchaseReport();
    }, []);

    const loadPurchaseReport = async () => {
        setLoading(true);
        try {
            const res = await api.get(
                `/reports/purchase?vendorId=${vendorId}&fromDate=${fromDate}&toDate=${toDate}`
            );
            setPurchaseData(res.data || []);
        } catch (err) {
            console.error("Failed to load purchase report:", err);
            alert("Failed to load purchase report");
        } finally {
            setLoading(false);
        }
    };

    const totalPurchase = purchaseData.reduce(
        (total, item) => total + item.grandTotal,
        0
    );

    const totalInvoices = purchaseData.length;

    const averageInvoiceValue =
        totalInvoices > 0
            ? Math.round(totalPurchase / totalInvoices)
            : 0;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">
                Purchase Report
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
                        value={vendorId}
                        onChange={(e) => setVendorId(e.target.value)}
                        className="border p-3 rounded-lg"
                    >
                        <option value="">
                            All Vendors
                        </option>
                        {vendors.filter(v => v.isActive).map((v) => (
                            <option key={v.id} value={v.id}>
                                {v.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={loadPurchaseReport}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                    >
                        Search
                    </button>
                </div>
            </div>

            {loading && (
                <div className="text-center mt-6 text-gray-500 font-semibold">
                    Loading purchase report...
                </div>
            )}

            {!loading && (
                <>
                    {/* Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="bg-white p-5 rounded-xl shadow">
                            <p className="text-gray-500">Total Purchases</p>
                            <p className="text-2xl font-bold text-green-600">
                                ₹ {totalPurchase.toFixed(2)}
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
                                    <th className="p-3">Vendor</th>
                                    <th className="p-3">Qty</th>
                                    <th className="p-3">Amount</th>
                                </tr>
                            </thead>

                            <tbody>
                                {purchaseData.map((purchase) => (
                                    <tr key={purchase.id} className="border-t">
                                        <td className="p-3">{purchase.invoiceNo}</td>
                                        <td className="p-3">{purchase.invoiceDate.split("T")[0]}</td>
                                        <td className="p-3 text-left">{purchase.vendor?.name}</td>
                                        <td className="p-3">{purchase.totalQty}</td>
                                        <td className="p-3 font-semibold">₹ {purchase.grandTotal.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {purchaseData.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-6 text-gray-500 text-center">
                                            No purchase invoices found for this period.
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

export default PurchaseReport;