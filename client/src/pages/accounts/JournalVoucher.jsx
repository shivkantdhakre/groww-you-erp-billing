import { useState, useEffect } from "react";
import CommonModal from "../../components/common/CommonModal";
import api from "../../utils/api";

function JournalVoucher() {
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [debitAccount, setDebitAccount] = useState("");
  const [creditAccount, setCreditAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");

  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    try {
      const res = await api.get("/transactions/vouchers?type=JOURNAL");
      setEntries(res.data);
    } catch (err) {
      console.error("Failed to load journal vouchers:", err);
    }
  };

  const saveVoucher = async () => {
    if (!debitAccount || !creditAccount || !amount) {
      setMessage("Please fill all required fields");
      setMessageType("error");
      return;
    }
    if (Number(amount) <= 0) {
      setMessage("Enter valid amount");
      setMessageType("error");
      return;
    }
    if (debitAccount === creditAccount) {
      setMessage("Debit and Credit Account cannot be same");
      setMessageType("warning");
      return;
    }

    try {
      await api.post("/transactions/vouchers", {
        type: "JOURNAL",
        debitAccount,
        creditAccount,
        amount: parseFloat(amount),
        remarks: narration,
        voucherDate: date,
      });

      await loadVouchers();

      setMessage("Voucher Saved Successfully");
      setMessageType("success");
      setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 3000);

      setDebitAccount("");
      setCreditAccount("");
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
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Journal Voucher
      </h1>
      <p className="text-gray-500 mb-6">
        Manage journal voucher entries
      </p>

      {message && (
        <div
          className={`p-3 rounded-lg mb-4 text-white ${messageType === "success"
            ? "bg-green-600"
            : messageType === "warning"
              ? "bg-yellow-500"
              : "bg-red-600"
            }`}
        >
          {message}
        </div>
      )}

      {/* Form */}

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
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border p-3 rounded-lg"
          />

          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border p-3 rounded-lg"
          />

          <select
            value={debitAccount}
            onChange={(e) => setDebitAccount(e.target.value)}
            className="border p-3 rounded-lg"
          >
            <option value="">Select Debit Account</option>
            <option>Cash A/c</option>
            <option>Bank A/c</option>
            <option>Purchase A/c</option>
            <option>Sales A/c</option>
          </select>
          <select
            value={creditAccount}
            onChange={(e) => setCreditAccount(e.target.value)}
            className="border p-3 rounded-lg"
          >
            <option value="">Select Credit Account</option>
            <option>Cash A/c</option>
            <option>Bank A/c</option>
            <option>Purchase A/c</option>
            <option>Sales A/c</option>
          </select>

          <input
            type="text"
            placeholder="Narration"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            className="border p-3 rounded-lg"
          />

        </div>

        <button
          onClick={saveVoucher}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg mt-4 cursor-pointer hover:bg-blue-700"
        >
          Save Voucher
        </button>

        <button
          onClick={() => {
            setDebitAccount("");
            setCreditAccount("");
            setAmount("");
            setNarration("");
            setMessage("");
            setMessageType("");
          }}
          className="bg-gray-500 text-white px-6 py-3 rounded-lg mt-4 ml-3 cursor-pointer hover:bg-gray-600"
        >
          Clear
        </button>

      </div>

      {/* Table */}

      <div className="bg-white p-5 rounded-xl shadow mt-6">

        <table className="w-full text-center">

          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-3">Voucher No</th>
              <th className="p-3">Date</th>
              <th className="p-3">Debit Account</th>
              <th className="p-3">Credit Account</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {entries.map((item) => (
              <tr key={item.id} className={`border-t ${item.isCancelled ? "bg-red-50 text-gray-400 line-through" : ""}`}>
                <td className="p-3">{item.voucherNo}</td>
                <td className="p-3">{item.voucherDate.split("T")[0]}</td>
                <td className="p-3">{item.debitAccount}</td>
                <td className="p-3">{item.creditAccount}</td>
                <td className="p-3">₹ {item.amount}</td>
                <td className="p-3">
                  {item.isCancelled ? (
                    <span className="text-red-500 font-semibold text-sm">Voided</span>
                  ) : (
                    <button
                      onClick={() => {
                        setDeleteId(item.id);
                        setShowDeleteModal(true);
                      }}
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
      <CommonModal
        isOpen={showDeleteModal}
        title="Void Confirmation"
      >
        <p className="mb-4">
          Are you sure you want to void this journal voucher?
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setShowDeleteModal(false);
              setDeleteId(null);
            }}
            className="bg-gray-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-gray-600"
          >
            Cancel
          </button>

          <button
            onClick={handleCancel}
            className="bg-red-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-red-700"
          >
            Void Voucher
          </button>
        </div>
      </CommonModal>
    </div>
  );
}

export default JournalVoucher;