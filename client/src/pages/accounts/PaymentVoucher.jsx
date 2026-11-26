import { useState, useEffect, useCallback } from "react";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import CommonCard from "../../components/common/CommonCard";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import StatusBadge from "../../components/common/StatusBadge";
import api from "../../utils/api";
import { Search, CreditCard, Ban, Save } from "lucide-react";

const INPUT_CLASS =
  "h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors";
const LABEL_CLASS =
  "block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

/**
 * Supplier payment voucher recording outward cash/bank/UPI settlements and vendor ledger updates.
 */
function PaymentVoucher() {
  const vendors = useStore((state) => state.vendors);
  const fetchVendors = useStore((state) => state.fetchVendors);

  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split("T")[0]);
  const [vendorId, setVendorId] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [amount, setAmount] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");

  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [voidTarget, setVoidTarget] = useState(null);
  const [voiding, setVoiding] = useState(false);

  const loadVouchers = useCallback(async () => {
    try {
      const res = await api.get("/transactions/vouchers?type=PAYMENT");
      setPayments(res.data.data || []);
    } catch (err) {
      console.error("Failed to load payment vouchers:", err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors().catch((err) => console.error("Failed to fetch vendors:", err));
      loadVouchers();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchVendors, loadVouchers]);

  const savePayment = async () => {
    if (!vendorId || !paymentMode || !amount) {
      setMessage("Please fill all required fields (Vendor, Payment Mode, and Amount).");
      setMessageType("warning");
      return;
    }
    if (Number(amount) <= 0) {
      setMessage("Payment amount must be greater than 0.");
      setMessageType("error");
      return;
    }

    try {
      await api.post("/transactions/vouchers", {
        type: "PAYMENT",
        vendorId: parseInt(vendorId, 10),
        amount: parseFloat(amount),
        paymentMode,
        referenceNo,
        remarks,
        voucherDate,
      });

      await fetchVendors(true);
      await loadVouchers();

      setVendorId("");
      setPaymentMode("");
      setAmount("");
      setReferenceNo("");
      setRemarks("");

      setMessage("Payment voucher saved and vendor balance updated.");
      setMessageType("success");
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to save payment voucher.");
      setMessageType("error");
    }
  };

  const confirmVoidVoucher = async () => {
    if (!voidTarget) return;
    setVoiding(true);
    try {
      await api.post(`/transactions/vouchers/${voidTarget.id}/cancel`);
      await fetchVendors(true);
      await loadVouchers();
      setMessage(`Voucher ${voidTarget.voucherNo} voided successfully.`);
      setMessageType("success");
      setVoidTarget(null);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to void voucher.");
      setMessageType("error");
    } finally {
      setVoiding(false);
    }
  };

  const activeTotal = payments
    .filter((p) => !p.isCancelled)
    .reduce((total, payment) => total + Number(payment.amount || 0), 0);

  const filteredPayments = payments.filter((payment) =>
    (payment.vendor?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Payment Voucher"
        subtitle="Record supplier payouts across Cash, Bank, or UPI and reconcile payable ledgers"
      />

      <ValidationMessage
        type={messageType}
        message={message}
        onDismiss={() => setMessage("")}
        className="mt-0!"
      />

      {/* Entry Form + Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 items-start">
        <div className="xl:col-span-3 bg-card p-5 rounded-lg border border-border surface-shadow space-y-4">
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
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Vendor *</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className={`${INPUT_CLASS} cursor-pointer`}
              >
                <option value="">Select Vendor</option>
                {vendors
                  .filter((v) => v.isActive)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Bal: ₹{Number(v.outstandingBalance || 0).toFixed(2)})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS}>Payment Mode *</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className={`${INPUT_CLASS} cursor-pointer`}
              >
                <option value="">Select Mode</option>
                <option>Cash</option>
                <option>Bank</option>
                <option>UPI</option>
              </select>
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
              <label className={LABEL_CLASS}>Reference Number</label>
              <input
                type="text"
                placeholder="UTR / Cheque / Ref #"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Remarks</label>
            <textarea
              placeholder="Optional narration for ledger audit..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="p-3 rounded-md border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary w-full min-h-[72px]"
            />
          </div>

          <div className="pt-2 border-t border-border/70 flex justify-end">
            <button
              type="button"
              onClick={savePayment}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs sm:text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Payment Voucher</span>
            </button>
          </div>
        </div>

        <div>
          <CommonCard
            title="Active Payments (30d)"
            value={`₹ ${activeTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            color="text-success"
            subtitle={`${payments.filter((p) => !p.isCancelled).length} active vouchers`}
            icon={CreditCard}
          />
        </div>
      </div>

      {/* History Register */}
      <div className="bg-card rounded-lg border border-border surface-shadow overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Payment History</h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {filteredPayments.length} vouchers
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-9 pr-3 rounded-md bg-background border border-input text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full"
            />
          </div>
        </div>

        <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-2.5">Voucher No</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Vendor</th>
                <th className="px-4 py-2.5">Mode</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {filteredPayments.map((payment) => (
                <tr
                  key={payment.id}
                  className={`elevated-table-row transition-colors ${
                    payment.isCancelled ? "opacity-65 bg-destructive/5" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground">
                    {payment.voucherNo}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                    {payment.voucherDate.split("T")[0]}
                  </td>
                  <td className="px-4 py-2.5 text-foreground font-medium">
                    {payment.vendor?.name || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{payment.paymentMode}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-foreground tabular-nums">
                    ₹ {Number(payment.amount || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5">
                    {payment.isCancelled ? (
                      <StatusBadge variant="destructive">Voided</StatusBadge>
                    ) : (
                      <StatusBadge variant="success">Posted</StatusBadge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {!payment.isCancelled && (
                      <button
                        type="button"
                        onClick={() => setVoidTarget(payment)}
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-xs font-medium text-muted-foreground cursor-pointer transition-colors"
                      >
                        <Ban className="w-3 h-3" />
                        <span>Void</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No payment vouchers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrapper>
      </div>

      <ConfirmDialog
        isOpen={Boolean(voidTarget)}
        title="Void Payment Voucher"
        message={
          voidTarget
            ? `Void voucher ${voidTarget.voucherNo} (₹ ${Number(voidTarget.amount || 0).toFixed(2)})? Vendor payable balance will be restored.`
            : ""
        }
        confirmLabel="Void Voucher"
        loading={voiding}
        onConfirm={confirmVoidVoucher}
        onCancel={() => !voiding && setVoidTarget(null)}
      />
    </div>
  );
}

export default PaymentVoucher;
