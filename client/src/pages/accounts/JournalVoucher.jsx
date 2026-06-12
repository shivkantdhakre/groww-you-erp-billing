import { useState, useEffect, useCallback } from "react";
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

  const loadVouchers = useCallback(async () => {
    try {
      const res = await api.get("/transactions/vouchers?type=JOURNAL");
      setEntries(res.data.data);
    } catch (err) {
      console.error("Failed to load journal vouchers:", err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadVouchers();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadVouchers]);

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
    <div className="space-y-6 text-foreground">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          Journal Voucher
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage journal voucher entries
        </p>
      </div>

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

      {/* Form */}

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
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Debit Account</label>
            <select
              value={debitAccount}
              onChange={(e) => setDebitAccount(e.target.value)}
              className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
            >
              <option value="">Select Debit Account</option>
              <option>Cash A/c</option>
              <option>Bank A/c</option>
              <option>Purchase A/c</option>
              <option>Sales A/c</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Credit Account</label>
            <select
              value={creditAccount}
              onChange={(e) => setCreditAccount(e.target.value)}
              className="border border-border p-3 rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
            >
              <option value="">Select Credit Account</option>
              <option>Cash A/c</option>
              <option>Bank A/c</option>
              <option>Purchase A/c</option>
              <option>Sales A/c</option>
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
              setDebitAccount("");
              setCreditAccount("");
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">

            <thead className="bg-secondary/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="p-4 text-left font-semibold">Voucher No</th>
                <th className="p-4 text-left font-semibold">Date</th>
                <th className="p-4 text-left font-semibold">Debit Account</th>
                <th className="p-4 text-left font-semibold">Credit Account</th>
                <th className="p-4 text-right font-semibold">Amount</th>
                <th className="p-4 text-center font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {entries.map((item) => (
                <tr key={item.id} className={`hover:bg-secondary/20 transition-colors duration-150 ${item.isCancelled ? "bg-destructive/10 text-muted-foreground line-through" : ""}`}>
                  <td className="p-4 font-mono font-semibold text-foreground">{item.voucherNo}</td>
                  <td className="p-4 text-muted-foreground">{item.voucherDate.split("T")[0]}</td>
                  <td className="p-4 text-foreground font-medium">{item.debitAccount}</td>
                  <td className="p-4 text-foreground font-medium">{item.creditAccount}</td>
                  <td className="p-4 text-right font-mono font-bold text-foreground">₹ {item.amount.toFixed(2)}</td>
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
                  <td colSpan="6" className="p-8 text-center text-muted-foreground font-medium">
                    No journal vouchers found.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

      </div>
      <CommonModal
        isOpen={showDeleteModal}
        title="Void Confirmation"
      >
        <div className="text-foreground">
          <p className="mb-4">
            Are you sure you want to void this journal voucher?
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

export default JournalVoucher;