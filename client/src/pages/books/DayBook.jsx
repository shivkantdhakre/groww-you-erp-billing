import { useState, useEffect, useCallback } from "react";
import api from "../../utils/api";

function DayBook() {
    const [date, setDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadDayBook = useCallback(async () => {
        setLoading(true);
        try {
            // Day book date range covers the selected date from 00:00 to 23:59
            const res = await api.get(`/reports/day-book?fromDate=${date}&toDate=${date}`);
            setEntries(res.data || []);
        } catch (err) {
            console.error("Failed to load day book:", err);
            alert("Failed to load day book records");
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadDayBook();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadDayBook]);

    const totalEntries = entries.length;

    const totalDebit = entries
        .filter(item => !item.isCancelled)
        .reduce((total, item) => total + item.debit, 0);

    const totalCredit = entries
        .filter(item => !item.isCancelled)
        .reduce((total, item) => total + item.credit, 0);

    return (
        <div className="space-y-6 text-foreground">
            <div>
                <h1 className="text-3xl font-bold text-foreground">
                    Day Book
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Show all daily transactions
                </p>
            </div>

            {/* Filter */}
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />

                    <button
                        onClick={loadDayBook}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-lg cursor-pointer transition shadow-sm"
                    >
                        Search
                    </button>

                    <button
                        onClick={() => {
                            const today = new Date().toISOString().split("T")[0];
                            setDate(today);
                            setTimeout(() => {
                                loadDayBook();
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
                    <span>Loading daily transactions...</span>
                </div>
            )}

            {!loading && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Entries</p>
                            <p className="text-2xl font-bold text-primary mt-1">
                                {totalEntries}
                            </p>
                        </div>

                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Debit (Outgoing/Sales)</p>
                            <p className="text-2xl font-bold text-destructive mt-1">
                                ₹ {totalDebit.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Total Credit (Incoming/Receipts)</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">
                                ₹ {totalCredit.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 mb-3 no-print">
                        <button
                            onClick={() => window.print()}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-lg cursor-pointer transition shadow-sm"
                        >
                            Print Day Book
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-secondary/40 text-muted-foreground border-b border-border">
                                    <tr>
                                        <th className="p-4 text-left font-semibold">Date</th>
                                        <th className="p-4 text-left font-semibold">Voucher/Invoice No</th>
                                        <th className="p-4 text-left font-semibold">Type</th>
                                        <th className="p-4 text-left font-semibold">Particulars</th>
                                        <th className="p-4 text-right font-semibold">Debit (Dr)</th>
                                        <th className="p-4 text-right font-semibold">Credit (Cr)</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-border">
                                    {entries.map((item, index) => (
                                        <tr key={index} className={`hover:bg-secondary/20 transition-colors duration-150 ${item.isCancelled ? "bg-destructive/10 text-muted-foreground line-through" : ""}`}>
                                            <td className="p-4 text-muted-foreground">{item.date}</td>
                                            <td className="p-4 font-mono font-semibold text-foreground">{item.voucherNo}</td>
                                            <td className="p-4 text-foreground font-medium">
                                                {item.type}
                                                {item.isCancelled && <span className="text-destructive text-xs font-bold ml-1.5">(Voided)</span>}
                                            </td>
                                            <td className="p-4 text-left text-muted-foreground">{item.particulars}</td>
                                            <td className="p-4 text-right font-mono text-destructive">₹ {item.debit.toFixed(2)}</td>
                                            <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-500">₹ {item.credit.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {entries.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-muted-foreground text-center font-medium">
                                                No transactions recorded on this day.
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

export default DayBook;