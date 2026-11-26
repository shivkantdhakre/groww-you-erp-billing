import { useState, useEffect, useCallback } from "react";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import StatusBadge from "../../components/common/StatusBadge";
import api from "../../utils/api";
import { formatINR, formatCount } from "../../utils/formatters";
import { PenLine, Ban, RotateCcw, Save } from "lucide-react";

const INPUT_CLASS = "erp-input";
const LABEL_CLASS = "erp-label";

/**
 * Double-entry journal adjustment voucher register.
 */
function JournalVoucher() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [debitAccount, setDebitAccount] = useState("");
  const [creditAccount, setCreditAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");

  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [voidTarget, setVoidTarget] = useState(null);
  const [voiding, setVoiding] = useState(false);

  const loadVouchers = useCallback(async () => {
    try {
      const res = await api.get("/transactions/vouchers?type=JOURNAL");
      setEntries(res.data.data || []);
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

  const resetForm = () => {
    setDebitAccount("");
    setCreditAccount("");
    setAmount("");
    setNarration("");
    setMessage("");
    setMessageType("");
  };

  const saveVoucher = async () => {
    if (!debitAccount || !creditAccount || !amount) {
      setMessage("Please fill all required fields.");
      setMessageType("error");
      return;
    }
    if (Number(amount) <= 0) {
      setMessage("Enter a valid voucher amount.");
      setMessageType("error");
      return;
    }
    if (debitAccount === creditAccount) {
      setMessage("Debit and Credit account cannot be the same.");
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

      setDebitAccount("");
      setCreditAccount("");
      setAmount("");
      setNarration("");
      setMessage("Journal voucher saved successfully.");
      setMessageType("success");
      setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 3000);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to save voucher.");
      setMessageType("error");
    }
  };

  const handleCancel = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      await api.post(`/transactions/vouchers/${voidTarget.id}/cancel`);
      await loadVouchers();
      setVoidTarget(null);
      setMessage("Voucher voided successfully.");
      setMessageType("success");
      setTimeout(() => {
        setMessage("");
        setMessageType("");
      }, 3000);
    } catch (err) {
      setVoidTarget(null);
      setMessage(err.response?.data?.error || "Failed to void voucher.");
      setMessageType("error");
    } finally {
      setVoiding(false);
    }
  };

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Journal Voucher"
        subtitle="Record double-entry ledger adjustments between nominal and general accounts"
        badge={
          <StatusBadge variant="neutral tabular-nums">
            {entries.filter((e) => !e.isCancelled).length} active entries
          </StatusBadge>
        }
      />

      <ValidationMessage
        type={messageType}
        message={message}
        onDismiss={() => setMessage("")}
        className="mt-0!"
      />

      <div className="bg-card p-5 rounded-lg border border-border surface-shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={LABEL_CLASS}>Voucher Number</label>
            <input
              type="text"
              value="Auto Generated"
              readOnly
              className="h-9 px-3 rounded-md w-full border border-border bg-muted text-muted-foreground font-mono text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Voucher Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Amount (₹) *</label>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${INPUT_CLASS} font-mono tabular-nums`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Debit Account (Dr) *</label>
            <select
              value={debitAccount}
              onChange={(e) => setDebitAccount(e.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              <option value="">Select Debit Account</option>
              <option>Cash A/c</option>
              <option>Bank A/c</option>
              <option>Purchase A/c</option>
              <option>Sales A/c</option>
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>Credit Account (Cr) *</label>
            <select
              value={creditAccount}
              onChange={(e) => setCreditAccount(e.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              <option value="">Select Credit Account</option>
              <option>Cash A/c</option>
              <option>Bank A/c</option>
              <option>Purchase A/c</option>
              <option>Sales A/c</option>
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS}>Narration</label>
            <input
              type="text"
              placeholder="Adjustment reference"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 mt-5 pt-4 border-t border-border/70">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-medium cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
          <button
            type="button"
            onClick={saveVoucher}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs sm:text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Journal Voucher</span>
          </button>
        </div>
      </div>

      {/* Journal Table */}
      <div className="bg-card rounded-lg border border-border surface-shadow overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-primary-text" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground">Voucher Journal</h2>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{formatCount(entries.length, "record")}</span>
        </div>

        <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-2.5">Voucher No</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Debit Account</th>
                <th className="px-4 py-2.5">Credit Account</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {entries.map((item) => (
                <tr
                  key={item.id}
                  className={`elevated-table-row transition-colors ${
                    item.isCancelled ? "opacity-65 bg-destructive/5" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground">
                    {item.voucherNo}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                    {item.voucherDate.split("T")[0]}
                  </td>
                  <td className="px-4 py-2.5 text-foreground font-medium">{item.debitAccount}</td>
                  <td className="px-4 py-2.5 text-foreground font-medium">{item.creditAccount}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground tabular-nums whitespace-nowrap">
                    {formatINR(item.amount)}
                  </td>
                  <td className="px-4 py-2.5">
                    {item.isCancelled ? (
                      <StatusBadge variant="destructive">Voided</StatusBadge>
                    ) : (
                      <StatusBadge variant="success">Posted</StatusBadge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!item.isCancelled && (
                      <button
                        type="button"
                        onClick={() => setVoidTarget(item)}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-xs font-medium text-muted-foreground cursor-pointer transition-colors"
                      >
                        <Ban className="w-3 h-3" />
                        <span>Void</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No journal vouchers recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrapper>
      </div>

      <ConfirmDialog
        isOpen={Boolean(voidTarget)}
        title="Void Journal Voucher"
        message={
          voidTarget
            ? `Are you sure you want to void journal voucher ${voidTarget.voucherNo}?`
            : ""
        }
        confirmLabel="Void Voucher"
        loading={voiding}
        onConfirm={handleCancel}
        onCancel={() => !voiding && setVoidTarget(null)}
      />
    </div>
  );
}

export default JournalVoucher;
