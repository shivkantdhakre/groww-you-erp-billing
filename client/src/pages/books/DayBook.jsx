import { useState, useEffect } from "react";
import api from "../../utils/api";

function DayBook() {
    const [date, setDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadDayBook();
    }, []);

    const loadDayBook = async () => {
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
    };

    const totalEntries = entries.length;

    const totalDebit = entries
        .filter(item => !item.isCancelled)
        .reduce((total, item) => total + item.debit, 0);

    const totalCredit = entries
        .filter(item => !item.isCancelled)
        .reduce((total, item) => total + item.credit, 0);

    return (
        <div>
            <h1 className="text-3xl font-bold">
                Day Book
            </h1>

            <p className="text-gray-500 mb-6">
                Show all daily transactions
            </p>

            {/* Filter */}
            <div className="bg-white p-5 rounded-xl shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border p-3 rounded-lg"
                    />

                    <button
                        onClick={loadDayBook}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
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
                        className="bg-gray-500 hover:bg-gray-600 text-white rounded-lg cursor-pointer"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {loading && (
                <div className="text-center mt-6 text-gray-500 font-semibold">
                    Loading daily transactions...
                </div>
            )}

            {!loading && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white p-5 rounded-xl shadow">
                            <p className="text-gray-500">Total Entries</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {totalEntries}
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow">
                            <p className="text-gray-500">Total Debit (Outgoing/Sales)</p>
                            <p className="text-2xl font-bold text-red-600">
                                ₹ {totalDebit.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow">
                            <p className="text-gray-500">Total Credit (Incoming/Receipts)</p>
                            <p className="text-2xl font-bold text-green-600">
                                ₹ {totalCredit.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 mb-3">
                        <button
                            onClick={() => window.print()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer"
                        >
                            Print Day Book
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-white p-5 rounded-xl shadow">
                        <table className="w-full text-center">
                            <thead className="bg-blue-600 text-white">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Voucher/Invoice No</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Particulars</th>
                                    <th className="p-3">Debit (Dr)</th>
                                    <th className="p-3">Credit (Cr)</th>
                                </tr>
                            </thead>

                            <tbody>
                                {entries.map((item, index) => (
                                    <tr key={index} className={`border-t ${item.isCancelled ? "bg-red-50 text-gray-400 line-through" : ""}`}>
                                        <td className="p-3">{item.date}</td>
                                        <td className="p-3">{item.voucherNo}</td>
                                        <td className="p-3">
                                            {item.type}
                                            {item.isCancelled && <span className="text-red-500 text-xs font-bold ml-1">(Voided)</span>}
                                        </td>
                                        <td className="p-3 text-left">{item.particulars}</td>
                                        <td className="p-3 text-red-600">₹ {item.debit.toFixed(2)}</td>
                                        <td className="p-3 text-green-600">₹ {item.credit.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {entries.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-6 text-gray-500 text-center">
                                            No transactions recorded on this day.
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

export default DayBook;