import { useState, useEffect, useCallback } from "react";
import { useStore } from "../../store/useStore";
import TableWrapper from "../../components/common/TableWrapper";
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

    const loadVouchers = useCallback(async () => {
        try {
            const res = await api.get("/transactions/vouchers?type=RECEIPT");
            setPayments(res.data.data);
        } catch (err) {
            console.error("Failed to load receipt vouchers:", err);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers().catch((err) => console.error("Failed to fetch customers:", err));
            loadVouchers();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchCustomers, loadVouchers]);

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
        <div className="space-y-6 text-foreground">
            <h1 className="text-3xl font-bold mb-6 text-foreground">
                Receipt Voucher
            </h1>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Voucher Number</label>
                        <input
                            type="text"
                            value="Auto Generated"
                            readOnly
                            className="border border-border p-3 rounded-lg bg-muted text-muted-foreground font-medium text-sm focus:outline-none"
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Voucher Date</label>
                        <input
                            type="date"
                            value={voucherDate}
                            onChange={(e) => setVoucherDate(e.target.value)}
                            className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Customer</label>
                        <select
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                            className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                        >
                            <option value="">Select Customer</option>
                            {customers.filter(c => c.isActive).map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} (Bal: ₹{c.outstandingBalance.toFixed(2)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Receipt Mode</label>
                        <select
                            value={receiptMode}
                            onChange={(e) => setReceiptMode(e.target.value)}
                            className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                        >
                            <option value="">Receipt Mode</option>
                            <option>Cash</option>
                            <option>Bank</option>
                            <option>UPI</option>
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Amount</label>
                        <input
                            type="number"
                            placeholder="Amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Reference Number</label>
                        <input
                            type="text"
                            placeholder="Reference Number"
                            value={referenceNo}
                            onChange={(e) => setReferenceNo(e.target.value)}
                            className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                </div>

                <div className="flex flex-col mt-4">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Remarks</label>
                    <textarea
                        placeholder="Remarks"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="border border-border p-3 rounded-lg w-full bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px]"
                    />
                </div>

                <button
                    onClick={saveReceipt}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold cursor-pointer hover:bg-primary/90 transition shadow-sm mt-4"
                >
                    Save Voucher
                </button>
            </div>
            
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm mt-6 mb-4 w-72">
                <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    Total Active Receipts (Last 30 Days)
                </h3>

                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-500 mt-1">
                    ₹{" "}
                    {payments
                        .filter(p => !p.isCancelled)
                        .reduce(
                            (total, payment) => total + Number(payment.amount),
                            0
                        ).toFixed(2)}
                </p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm mt-6 overflow-hidden">
                <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-foreground">
                        Receipt History
                    </h2>

                    <input
                        type="text"
                        placeholder="Search Customer..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border border-border p-2.5 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full md:w-64"
                    />
                </div>

                <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary/40 text-muted-foreground border-b border-border">
                            <tr>
                                <th className="p-4 text-left font-semibold">Voucher No</th>
                                <th className="p-4 text-left font-semibold">Date</th>
                                <th className="p-4 text-left font-semibold">Customer</th>
                                <th className="p-4 text-right font-semibold">Amount</th>
                                <th className="p-4 text-left font-semibold">Mode</th>
                                <th className="p-4 text-center font-semibold">Action</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                            {payments
                                .filter((payment) =>
                                    (payment.customer?.name || "")
                                        .toLowerCase()
                                        .includes(search.toLowerCase())
                                )
                                .map((payment) => (
                                    <tr key={payment.id} className={`hover:bg-secondary/20 transition-colors duration-150 ${payment.isCancelled ? "bg-destructive/10 text-muted-foreground line-through" : ""}`}>
                                        <td className="p-4 font-mono font-semibold text-foreground">{payment.voucherNo}</td>
                                        <td className="p-4 text-muted-foreground">{payment.voucherDate.split("T")[0]}</td>
                                        <td className="p-4 text-foreground font-medium">{payment.customer?.name}</td>
                                        <td className="p-4 text-right font-mono font-bold text-foreground">₹ {payment.amount.toFixed(2)}</td>
                                        <td className="p-4 text-foreground font-medium">{payment.paymentMode}</td>

                                        <td className="p-4 text-center">
                                            {payment.isCancelled ? (
                                                <span className="text-destructive font-semibold text-sm">Voided</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleCancel(payment.id)}
                                                    className="bg-destructive text-destructive-foreground px-3 py-1 rounded cursor-pointer hover:bg-destructive/90 text-xs font-semibold shadow-sm"
                                                >
                                                    Void
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            {payments.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-muted-foreground font-medium">
                                        No receipt vouchers found.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                    </table>
                </TableWrapper>
            </div>
        </div>
    );
}

export default ReceiptVoucher;