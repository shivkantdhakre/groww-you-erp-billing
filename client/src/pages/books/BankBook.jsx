import { useState, useEffect, useCallback } from "react";
import api from "../../utils/api";

function BankBook() {
    const [bankAccount, setBankAccount] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [bankEntries, setBankEntries] = useState([]);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [loading, setLoading] = useState(false);

    const loadBankBook = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/reports/bank-book?fromDate=${fromDate}&toDate=${toDate}`);
            setOpeningBalance(res.data.openingBank || 0);
            setBankEntries(res.data.bankEntries || []);
        } catch (err) {
            console.error("Failed to load bank book:", err);
            alert("Failed to load bank book data");
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadBankBook();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadBankBook]);

    const filteredEntries = bankEntries.filter((entry) => {
        if (!bankAccount) return true;
        // Match specific bank name in particulars or remarks
        return entry.particulars.toLowerCase().includes(bankAccount.toLowerCase());
    });

    // Compute totals based on filtered records
    const totalDeposit = filteredEntries.reduce(
        (total, item) => total + item.receipt,
        0
    );

    const totalWithdrawal = filteredEntries.reduce(
        (total, item) => total + item.payment,
        0
    );

    const closingBalance = openingBalance + totalDeposit - totalWithdrawal;

    return (
        <div className="space-y-6 text-foreground">
            <div>
                <h1 className="text-3xl font-bold text-foreground">
                    Bank Book
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Track all bank transactions
                </p>
            </div>

            {/* Filters */}
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <select
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
                    >
                        <option value="">
                            All Bank Accounts
                        </option>
                        <option>HDFC Bank</option>
                        <option>ICICI Bank</option>
                        <option>UPI</option>
                    </select>

                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />

                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />

                    <button
                        onClick={loadBankBook}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg cursor-pointer transition shadow-sm"
                    >
                        Search
                    </button>
                    <button
                        onClick={() => {
                            setBankAccount("");
                            setFromDate("");
                            setToDate("");
                            setTimeout(() => {
                                loadBankBook();
                            }, 100);
                        }}
                        className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold py-3 px-4 rounded-lg cursor-pointer transition"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {loading && (
                <div className="text-center mt-6 text-muted-foreground font-semibold flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Loading bank book records...</span>
                </div>
            )}

            {!loading && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Opening Balance</p>
                            <p className="text-2xl font-bold text-primary mt-1">
                                ₹ {openingBalance.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Deposit</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">
                                ₹ {totalDeposit.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Withdrawal</p>
                            <p className="text-2xl font-bold text-destructive mt-1">
                                ₹ {totalWithdrawal.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Closing Balance</p>
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                                ₹ {closingBalance.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6 mb-3 no-print">
                        <button
                            onClick={() => window.print()}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-lg cursor-pointer transition shadow-sm"
                        >
                            Print Bank Book
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-card rounded-xl border border-border shadow-sm mt-6 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-secondary/40 text-muted-foreground border-b border-border">
                                    <tr>
                                        <th className="p-4 text-left font-semibold">Date</th>
                                        <th className="p-4 text-left font-semibold">Voucher No</th>
                                        <th className="p-4 text-left font-semibold">Particulars</th>
                                        <th className="p-4 text-right font-semibold">Deposit (Dr)</th>
                                        <th className="p-4 text-right font-semibold">Withdrawal (Cr)</th>
                                        <th className="p-4 text-right font-semibold">Balance</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-border">
                                    {filteredEntries.map((item, index) => (
                                        <tr key={index} className="hover:bg-secondary/20 transition-colors duration-150">
                                            <td className="p-4 text-muted-foreground">{item.date}</td>
                                            <td className="p-4 font-mono font-semibold text-foreground">{item.voucherNo}</td>
                                            <td className="p-4 text-foreground font-medium text-left">{item.particulars}</td>
                                            <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-500">₹ {item.receipt.toFixed(2)}</td>
                                            <td className="p-4 text-right font-mono text-destructive">₹ {item.payment.toFixed(2)}</td>
                                            <td className="p-4 text-right font-mono font-bold text-foreground">₹ {item.balance.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {filteredEntries.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-muted-foreground text-center font-medium">
                                                No bank transactions found for this period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default BankBook;