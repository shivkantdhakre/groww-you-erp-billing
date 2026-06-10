import { useState, useEffect } from "react";
import api from "../../utils/api";

function CashBook() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [cashEntries, setCashEntries] = useState([]);
  const [openingCash, setOpeningCash] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCashBook();
  }, []);

  const loadCashBook = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/cash-book?fromDate=${fromDate}&toDate=${toDate}`);
      setOpeningCash(res.data.openingCash || 0);
      setCashEntries(res.data.cashEntries || []);
    } catch (err) {
      console.error("Failed to load cash book:", err);
      alert("Failed to load cash book data");
    } finally {
      setLoading(false);
    }
  };

  const totalReceipt = cashEntries.reduce(
    (total, item) => total + item.receipt,
    0
  );

  const totalPayment = cashEntries.reduce(
    (total, item) => total + item.payment,
    0
  );

  const closingCash = openingCash + totalReceipt - totalPayment;

  return (
    <div>
      <h1 className="text-3xl font-bold">
        Cash Book
      </h1>

      <p className="text-gray-500 mb-6">
        Track all cash transactions
      </p>

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

          <button
            onClick={loadCashBook}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
          >
            Search
          </button>
          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
              // Wait briefly before reloading to let state clear
              setTimeout(() => {
                loadCashBook();
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
          Loading cash book records...
        </div>
      )}

      {!loading && (
        <>
          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white p-5 rounded-xl shadow">
              <p className="text-gray-500">Opening Cash</p>
              <p className="text-2xl font-bold text-blue-600">
                ₹ {openingCash.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              <p className="text-gray-500">Total Receipt</p>
              <p className="text-2xl font-bold text-green-600">
                ₹ {totalReceipt.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              <p className="text-gray-500">Total Payment</p>
              <p className="text-2xl font-bold text-red-600">
                ₹ {totalPayment.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow">
              <p className="text-gray-500">Closing Cash</p>
              <p className="text-2xl font-bold text-purple-600">
                ₹ {closingCash.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6 mb-3">
            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer"
            >
              Print Cash Book
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
                  <th className="p-3">Receipt (Dr)</th>
                  <th className="p-3">Payment (Cr)</th>
                  <th className="p-3">Balance</th>
                </tr>
              </thead>

              <tbody>
                {cashEntries.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3">{item.date}</td>
                    <td className="p-3">{item.voucherNo}</td>
                    <td className="p-3 text-left">{item.particulars}</td>
                    <td className="p-3 text-green-600">₹ {item.receipt.toFixed(2)}</td>
                    <td className="p-3 text-red-600">₹ {item.payment.toFixed(2)}</td>
                    <td className="p-3 font-semibold">₹ {item.balance.toFixed(2)}</td>
                  </tr>
                ))}
                {cashEntries.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-6 text-gray-500 text-center">
                      No cash transactions found for this period.
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

export default CashBook;