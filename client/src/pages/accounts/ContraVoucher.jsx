import { useState, useEffect, useCallback } from "react";
import CommonModal from "../../components/common/CommonModal";
import TableWrapper from "../../components/common/TableWrapper";
import api from "../../utils/api";

function ContraVoucher() {
    const [date, setDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    const [transferFrom, setTransferFrom] = useState("");
    const [transferTo, setTransferTo] = useState("");
    const [amount, setAmount] = useState("");
    const [narration, setNarration] = useState("");

    const [entries, setEntries] = useState([]);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const loadVouchers = useCallback(async () => {
        try {
            const res = await api.get("/transactions/vouchers?type=CONTRA");
            setEntries(res.data.data);
        } catch (err) {
            console.error("Failed to load contra vouchers:", err);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadVouchers();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadVouchers]);

    const saveVoucher = async () => {
        if (!transferFrom || !transferTo || !amount) {
            setMessage("Please fill all required fields");
            setMessageType("error");
            return;
        }
        if (Number(amount) <= 0) {
            setMessage("Enter valid amount");
            setMessageType("error");
            return;
        }
        if (transferFrom === transferTo) {
            setMessage("Transfer From and Transfer To cannot be same");
            setMessageType("warning");
            return;
        }

        try {
            await api.post("/transactions/vouchers", {
                type: "CONTRA",
                debitAccount: transferTo,
                creditAccount: transferFrom,
                amount: parseFloat(amount),
                remarks: narration,
                voucherDate: date,
            });

            await loadVouchers();

            setMessage("Contra Voucher Saved Successfully");
            setMessageType("success");
            setTimeout(() => {
                setMessage("");
                setMessageType("");
            }, 3000);

            setTransferFrom("");
            setTransferTo("");
            setAmount("");
            setNarration("");
        } catch (err) {
            setMessage(err.response?.data?.error || "Failed to save voucher");
            setMessageType("error");
        }
    };

    const handleCancel = async () => {
        try {
            await api.post(`/transactions/vouchers/${deleteId}/cancel`);
            await loadVouchers();
            setShowDeleteModal(false);
            setDeleteId(null);
            setMessage("Voucher Voided Successfully");
            setMessageType("success");
            setTimeout(() => {
                setMessage("");
                setMessageType("");
            }, 3000);
        } catch (err) {
            setShowDeleteModal(false);
            setMessage(err.response?.data?.error || "Failed to void voucher");
            setMessageType("error");
        }
    };

    return (
        <div className="space-y-6 text-foreground">
            <h1 className="text-3xl font-bold mb-6 text-foreground">
                Contra Voucher
            </h1>
            {message && (
                <div
                    className={`p-3 rounded-lg mb-4 text-white font-medium shadow-sm ${messageType === "success"
                        ? "bg-emerald-600"
                        : messageType === "warning"
                            ? "bg-amber-500"
                            : "bg-destructive"
                        }`}
                >
                    {message}
                </div>
            )}

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
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
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
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Transfer From</label>
                        <select
                            value={transferFrom}
                            onChange={(e) => setTransferFrom(e.target.value)}
                            className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                        >
                            <option value="">Transfer From</option>
                            <option>Cash</option>
                            <option>HDFC Bank</option>
                            <option>ICICI Bank</option>
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Transfer To</label>
                        <select
                            value={transferTo}
                            onChange={(e) => setTransferTo(e.target.value)}
                            className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                        >
                            <option value="">Transfer To</option>
                            <option>Cash</option>
                            <option>HDFC Bank</option>
                            <option>ICICI Bank</option>
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Narration</label>
                        <input
                            type="text"
                            placeholder="Narration"
                            value={narration}
                            onChange={(e) => setNarration(e.target.value)}
                            className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                </div>

                <div className="flex gap-3 mt-4">
                    <button
                        onClick={saveVoucher}
                        className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold cursor-pointer hover:bg-primary/90 transition shadow-sm"
                    >
                        Save Voucher
                    </button>
                    <button
                        onClick={() => {
                            setTransferFrom("");
                            setTransferTo("");
                            setAmount("");
                            setNarration("");
                            setMessage("");
                            setMessageType("");
                        }}
                        className="bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-semibold cursor-pointer hover:bg-secondary/80 transition"
                    >
                        Clear
                    </button>
                </div>

            </div>

            {/* Table */}

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mt-6">
                <div className="p-5 border-b border-border">
                    <h2 className="text-xl font-bold">Voucher Journal</h2>
                </div>

                <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
                    <table className="w-full text-sm">

                        <thead className="bg-secondary/40 text-muted-foreground border-b border-border">
                            <tr>
                                <th className="p-4 text-left font-semibold">Voucher No</th>
                                <th className="p-4 text-left font-semibold">Date</th>
                                <th className="p-4 text-left font-semibold">Transfer From</th>
                                <th className="p-4 text-left font-semibold">Transfer To</th>
                                <th className="p-4 text-right font-semibold">Amount</th>
                                <th className="p-4 text-left font-semibold">Narration</th>
                                <th className="p-4 text-center font-semibold">Action</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                            {entries.map((item) => (
                                <tr key={item.id} className={`hover:bg-secondary/20 transition-colors duration-150 ${item.isCancelled ? "bg-destructive/10 text-muted-foreground line-through" : ""}`}>
                                    <td className="p-4 font-mono font-semibold text-foreground">{item.voucherNo}</td>
                                    <td className="p-4 text-muted-foreground">{item.voucherDate.split("T")[0]}</td>
                                    <td className="p-4 text-foreground font-medium">{item.creditAccount}</td>
                                    <td className="p-4 text-foreground font-medium">{item.debitAccount}</td>
                                    <td className="p-4 text-right font-mono font-bold text-foreground">₹ {item.amount.toFixed(2)}</td>
                                    <td className="p-4 text-muted-foreground max-w-xs truncate">{item.remarks}</td>
                                    <td className="p-4 text-center">
                                        {item.isCancelled ? (
                                            <span className="text-destructive font-semibold text-sm">Voided</span>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setDeleteId(item.id);
                                                    setShowDeleteModal(true);
                                                }}
                                                className="bg-destructive text-destructive-foreground px-3 py-1 rounded cursor-pointer hover:bg-destructive/90 text-xs font-semibold shadow-sm"
                                            >
                                                Void
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {entries.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-muted-foreground font-medium">
                                        No contra vouchers found.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                    </table>
                </TableWrapper>

            </div>
            <CommonModal
                isOpen={showDeleteModal}
                title="Void Confirmation"
            >
                <div className="text-foreground">
                    <p className="mb-4">
                        Are you sure you want to void this contra voucher?
                    </p>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => {
                                setShowDeleteModal(false);
                                setDeleteId(null);
                            }}
                            className="bg-secondary text-secondary-foreground px-4 py-2 rounded cursor-pointer hover:bg-secondary/80 font-medium transition"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={handleCancel}
                            className="bg-destructive text-destructive-foreground px-4 py-2 rounded cursor-pointer hover:bg-destructive/90 font-medium transition"
                        >
                            Void Voucher
                        </button>
                    </div>
                </div>
            </CommonModal>
        </div>
    );
}

export default ContraVoucher;