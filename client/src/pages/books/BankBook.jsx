import { useState, useEffect } from "react";
import api from "../../utils/api";

function BankBook() {
    const [bankAccount, setBankAccount] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [bankEntries, setBankEntries] = useState([]);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadBankBook();
    }, []);

    const loadBankBook = async () => {
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
    };

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
        <div>
            <h1 className="text-3xl font-bold">
                Bank Book
            </h1>

            <p className="text-gray-500 mb-6">
                Track all bank transactions
            </p>

            {/* Filters */}
            <div className="bg-white p-5 rounded-xl shadow">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <select
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="border p-3 rounded-lg"
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
                        className="border p-3 rounded-lg"
                    />

                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="border p-3 rounded-lg"
                    />

                    <button
                        onClick={loadBankBook}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
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
                        className="bg-gray-500 hover:bg-gray-600 text-white rounded-lg cursor-pointer"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {loading && (
                <div className="text-center mt-6 text-gray-500 font-semibold">
                    Loading bank book records...
                </div>
            )}

            {!loading && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                        <div className="bg-white p-5 rounded-xl shadow">
                            <p className="text-gray-500">Opening Balance</p>
                            <p className="text-2xl font-bold text-blue-600">
                                ₹ {openingBalance.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow">
                            <p className="text-gray-500">Total Deposit</p>
                            <p className="text-2xl font-bold text-green-600">
                                ₹ {totalDeposit.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow">
                            <p className="text-gray-500">Total Withdrawal</p>
                            <p className="text-2xl font-bold text-red-600">
                                ₹ {totalWithdrawal.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow">
                            <p className="text-gray-500">Closing Balance</p>
                            <p className="text-2xl font-bold text-purple-600">
                                ₹ {closingBalance.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6 mb-3">
                        <button
                            onClick={() => window.print()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer"
                        >
                            Print Bank Book
                        </button>
                    </div>

                    {/* Table */}
                    <div className="bg-white p-5 rounded-xl shadow mt-6">
                        <table className="w-full text-center">
                            <thead className="bg-blue-600 text-white">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Voucher No</th>
                                    <th className="p-3">Particulars</th>
                                    <th className="p-3">Deposit (Dr)</th>
                                    <th className="p-3">Withdrawal (Cr)</th>
                                    <th className="p-3">Balance</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredEntries.map((item, index) => (
                                    <tr key={index} className="border-t">
                                        <td className="p-3">{item.date}</td>
                                        <td className="p-3">{item.voucherNo}</td>
                                        <td className="p-3 text-left">{item.particulars}</td>
                                        <td className="p-3 text-green-600">₹ {item.receipt.toFixed(2)}</td>
                                        <td className="p-3 text-red-600">₹ {item.payment.toFixed(2)}</td>
                                        <td className="p-3 font-semibold">₹ {item.balance.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {filteredEntries.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-6 text-gray-500 text-center">
                                            No bank transactions found for this period.
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

export default BankBook;