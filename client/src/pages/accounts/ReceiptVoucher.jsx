import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";

function ReceiptVoucher() {
    const customers = useStore((state) => state.customers);
    const fetchCustomers = useStore((state) => state.fetchCustomers);

    const [voucherDate, setVoucherDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    const [customerId, setCustomerId] = useState("");
    const [receiptMode, setReceiptMode] = useState("");
    const [amount, setAmount] = useState("");
    const [referenceNo, setReferenceNo] = useState("");
    const [remarks, setRemarks] = useState("");

    const [payments, setPayments] = useState([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchCustomers();
        loadVouchers();
    }, []);

    const loadVouchers = async () => {
        try {
            const res = await api.get("/transactions/vouchers?type=RECEIPT");
            setPayments(res.data);
        } catch (err) {
            console.error("Failed to load receipt vouchers:", err);
        }
    };

    const saveReceipt = async () => {
        if (!customerId || !receiptMode || !amount) {
            alert("Please fill all required fields");
            return;
        }
        if (Number(amount) <= 0) {
            alert("Amount must be greater than 0");
            return;
        }

        try {
            await api.post("/transactions/vouchers", {
                type: "RECEIPT",
                customerId: parseInt(customerId),
                amount: parseFloat(amount),
                paymentMode: receiptMode,
                referenceNo,
                remarks,
                voucherDate,
            });

            await fetchCustomers(true);
            await loadVouchers();

            setCustomerId("");
            setReceiptMode("");
            setAmount("");
            setReferenceNo("");
            setRemarks("");

            alert("Receipt Voucher Saved");
        } catch (err) {
            alert(err.response?.data?.error || "Failed to save voucher");
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm("Are you sure you want to void this voucher?")) return;
        try {
            await api.post(`/transactions/vouchers/${id}/cancel`);
            await fetchCustomers(true);
            await loadVouchers();
            alert("Voucher voided successfully");
        } catch (err) {
            alert(err.response?.data?.error || "Failed to void voucher");
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">
                Receipt Voucher
            </h1>

            <div className="bg-white p-5 rounded-xl shadow">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    <input
                        type="text"
                        value="Auto Generated"
                        readOnly
                        className="border p-3 rounded-lg bg-gray-100 text-gray-500 font-medium"
                    />

                    <input
                        type="date"
                        value={voucherDate}
                        onChange={(e) => setVoucherDate(e.target.value)}
                        className="border p-3 rounded-lg"
                    />

                    <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                        className="border p-3 rounded-lg"
                    >
                        <option value="">Select Customer</option>
                        {customers.filter(c => c.isActive).map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name} (Bal: ₹{c.outstandingBalance})
                            </option>
                        ))}
                    </select>

                    <select
                        value={receiptMode}
                        onChange={(e) => setReceiptMode(e.target.value)}
                        className="border p-3 rounded-lg"
                    >
                        <option value="">Receipt Mode</option>
                        <option>Cash</option>
                        <option>Bank</option>
                        <option>UPI</option>
                    </select>

                    <input
                        type="number"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="border p-3 rounded-lg"
                    />

                    <input
                        type="text"
                        placeholder="Reference Number"
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        className="border p-3 rounded-lg"
                    />

                </div>

                <textarea
                    placeholder="Remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="border p-3 rounded-lg w-full mt-4"
                />

                <button
                    onClick={saveReceipt}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg mt-4 cursor-pointer hover:bg-blue-700 transition-colors"
                >
                    Save Voucher
                </button>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow mt-6 mb-4 w-72">
                <h3 className="text-gray-500">
                    Total Active Receipts (Last 30 Days)
                </h3>

                <p className="text-3xl font-bold text-green-600">
                    ₹{" "}
                    {payments
                        .filter(p => !p.isCancelled)
                        .reduce(
                            (total, payment) => total + Number(payment.amount),
                            0
                        )}
                </p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow mt-6">
                <h2 className="text-xl font-bold mb-4">
                    Receipt History
                </h2>

                <input
                    type="text"
                    placeholder="Search Customer"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border p-3 rounded-lg mb-4 w-full"
                />
                <table className="w-full">
                    <thead className="bg-blue-600 text-white">
                        <tr>
                            <th className="p-3">Voucher No</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Mode</th>
                            <th className="p-3">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {payments
                            .filter((payment) =>
                                (payment.customer?.name || "")
                                    .toLowerCase()
                                    .includes(search.toLowerCase())
                            )
                            .map((payment) => (
                                <tr key={payment.id} className={`border-t text-center ${payment.isCancelled ? "bg-red-50 text-gray-400 line-through" : ""}`}>
                                    <td className="p-3">{payment.voucherNo}</td>
                                    <td className="p-3">{payment.voucherDate.split("T")[0]}</td>
                                    <td className="p-3">{payment.customer?.name}</td>
                                    <td className="p-3">₹ {payment.amount}</td>
                                    <td className="p-3">{payment.paymentMode}</td>

                                    <td className="p-3">
                                        {payment.isCancelled ? (
                                            <span className="text-red-500 font-semibold text-sm">Voided</span>
                                        ) : (
                                            <button
                                                onClick={() => handleCancel(payment.id)}
                                                className="bg-red-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-red-600"
                                            >
                                                Void
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                    </tbody>

                </table>
            </div>
        </div>
    );
}

export default ReceiptVoucher;