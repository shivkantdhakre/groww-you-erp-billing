import { useState, useEffect, useCallback } from "react";
import CommonModal from "../../components/common/CommonModal";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import CommonCard from "../../components/common/CommonCard";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import Autocomplete from "../../components/common/Autocomplete";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";
import { RotateCcw, Save } from "lucide-react";

const INPUT_CLASS =
  "h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors";
const READONLY_CLASS =
  "h-9 px-3 rounded-md w-full border border-border bg-muted text-muted-foreground text-sm focus:outline-none";
const LABEL_CLASS =
  "block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

/**
 * Debit-note / purchase return intake adjusting stock levels & supplier payables.
 */
function PurchaseReturn() {
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [vendorId, setVendorId] = useState(null);
  const [itemId, setItemId] = useState(null);
  const [purchaseInvoiceNo, setPurchaseInvoiceNo] = useState("");
  const [reason, setReason] = useState("");
  const [qty, setQty] = useState("");
  const [rate, setRate] = useState(0);

  const [returns, setReturns] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  const vendors = useStore((state) => state.vendors);
  const items = useStore((state) => state.items);
  const fetchVendors = useStore((state) => state.fetchVendors);
  const fetchItems = useStore((state) => state.fetchItems);
  const user = useStore((state) => state.user);

  const getBranchStock = (item) => {
    if (!item) return 0;
    return user?.branchId
      ? item.branchStocks?.find((b) => b.branchId === user.branchId)?.stock ?? 0
      : item.branchStocks?.reduce((sum, b) => sum + b.stock, 0) ?? 0;
  };

  const fetchPurchaseReturns = useCallback(async () => {
    setLoadingReturns(true);
    try {
      const res = await api.get("/transactions/purchase-returns");
      setReturns(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch purchase returns:", err);
    } finally {
      setLoadingReturns(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
    fetchItems();
    const timer = setTimeout(() => {
      fetchPurchaseReturns();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchVendors, fetchItems, fetchPurchaseReturns]);

  const selectedVendor = vendors.find((v) => v.id === vendorId);
  const selectedItem = items.find((i) => i.id === itemId);
  const amount = (parseFloat(qty) || 0) * rate;

  const handleSaveReturn = async () => {
    if (!vendorId) {
      setMessage("Please select a Vendor");
      setMessageType("error");
      return;
    }
    if (!itemId) {
      setMessage("Please select a Product");
      setMessageType("error");
      return;
    }
    const returnQty = parseInt(qty, 10) || 0;
    if (returnQty <= 0) {
      setMessage("Return quantity must be greater than 0");
      setMessageType("warning");
      return;
    }

    const stock = getBranchStock(selectedItem);
    if (selectedItem && returnQty > stock) {
      setMessage(`Insufficient stock to perform return. Available: ${stock}, Requested: ${returnQty}`);
      setMessageType("error");
      return;
    }

    try {
      const payload = {
        vendorId,
        itemId,
        qty: returnQty,
        invoiceNo: purchaseInvoiceNo,
        reason,
        returnDate,
      };

      await api.post("/transactions/purchase-returns", payload);

      await fetchItems(true);
      await fetchVendors(true);
      fetchPurchaseReturns();

      setVendorId(null);
      setItemId(null);
      setPurchaseInvoiceNo("");
      setReason("");
      setQty("");
      setRate(0);

      setMessage("Purchase Return saved successfully.");
      setMessageType("success");
      setShowSaveModal(true);

      setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (err) {
      console.error("Failed to save purchase return:", err);
      const errText =
        err.response?.data?.error || err.response?.data?.message || "Failed to save return";
      setMessage(errText);
      setMessageType("error");
    }
  };

  const totalReturnAmount =
    Math.round(returns.reduce((total, item) => total + (Number(item.grandTotal) || 0), 0) * 100) /
    100;

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Purchase Return"
        subtitle="Record debit returns to suppliers, deduct stock, and adjust payable balances"
      />

      <ValidationMessage
        type={messageType}
        message={message}
        onDismiss={() => setMessage("")}
        className="mt-0!"
      />

      {/* Top Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 items-start">
        <div className="xl:col-span-3 bg-card text-foreground p-5 rounded-lg border border-border surface-shadow">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={LABEL_CLASS}>Return Number</label>
              <input
                type="text"
                value="[Auto-Generated]"
                readOnly
                className={`${READONLY_CLASS} font-mono`}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Return Date</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Vendor Name</label>
              <Autocomplete
                options={vendors}
                labelKey="name"
                valueKey="id"
                placeholder="Select vendor..."
                selectedId={vendorId}
                searchFields={["name", "mobile"]}
                customRender={(opt) => (
                  <div className="flex justify-between w-full gap-2">
                    <span className="font-medium text-foreground truncate">{opt.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      Bal: ₹ {opt.outstandingBalance}
                    </span>
                  </div>
                )}
                onSelect={(opt) => setVendorId(opt.id)}
                onClear={() => setVendorId(null)}
              />
              {selectedVendor && (
                <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                  Payable Balance:{" "}
                  <span className="font-semibold text-foreground">
                    ₹ {selectedVendor.outstandingBalance}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className={LABEL_CLASS}>Purchase Invoice No</label>
              <input
                type="text"
                placeholder="e.g. GY-PUR-0001 (Optional)"
                value={purchaseInvoiceNo}
                onChange={(e) => setPurchaseInvoiceNo(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Reason</label>
              <input
                type="text"
                placeholder="e.g. Defective batch"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Product</label>
              <Autocomplete
                options={items}
                labelKey="name"
                valueKey="id"
                placeholder="Select product..."
                selectedId={itemId}
                searchFields={["name", "sku"]}
                customRender={(opt) => (
                  <div className="flex justify-between w-full gap-2">
                    <span className="font-medium text-foreground truncate">{opt.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      Stock: {getBranchStock(opt)} | Cost: ₹ {opt.purchasePrice}
                    </span>
                  </div>
                )}
                onSelect={(opt) => {
                  setItemId(opt.id);
                  setRate(opt.purchasePrice);
                }}
                onClear={() => {
                  setItemId(null);
                  setRate(0);
                }}
              />
              {selectedItem && (
                <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                  Current Stock:{" "}
                  <span className="font-semibold text-foreground">{getBranchStock(selectedItem)}</span>
                </p>
              )}
            </div>

            <div>
              <label className={LABEL_CLASS}>Quantity</label>
              <input
                type="number"
                placeholder="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={`${INPUT_CLASS} tabular-nums`}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Purchase Rate</label>
              <input
                type="text"
                value={itemId ? `₹ ${rate}` : "-"}
                readOnly
                className={`${READONLY_CLASS} tabular-nums font-medium`}
              />
            </div>

            <div>
              <label className={LABEL_CLASS}>Return Value</label>
              <input
                type="text"
                value={`₹ ${amount.toFixed(2)}`}
                readOnly
                className={`${READONLY_CLASS} tabular-nums font-semibold text-foreground`}
              />
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border/70 flex justify-end">
            <button
              type="button"
              onClick={handleSaveReturn}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Purchase Return</span>
            </button>
          </div>
        </div>

        <div>
          <CommonCard
            title="Total Purchase Returns"
            value={`₹ ${totalReturnAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            color="text-destructive"
            subtitle={`${returns.length} debit note${returns.length === 1 ? "" : "s"} recorded`}
            icon={RotateCcw}
          />
        </div>
      </div>

      {/* Register Table */}
      <div className="bg-card text-foreground rounded-lg border border-border surface-shadow overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Purchase Return Register</h2>
          <span className="text-xs text-muted-foreground tabular-nums">{returns.length} entries</span>
        </div>

        {loadingReturns ? (
          <div className="text-center py-8 text-xs text-muted-foreground">Loading returns...</div>
        ) : returns.length > 0 ? (
          <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Return No</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Vendor</th>
                  <th className="px-4 py-2.5">Invoice Ref</th>
                  <th className="px-4 py-2.5">Item</th>
                  <th className="px-4 py-2.5 text-right">Qty</th>
                  <th className="px-4 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {returns.map((item) => (
                  <tr key={item.id} className="elevated-table-row transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground">
                      {item.returnNo}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {new Date(item.returnDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-foreground font-medium">
                      {item.vendor?.name || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                      {item.invoiceNo || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">
                      {item.items?.[0]?.item?.name || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                      {item.totalQty}
                    </td>
                    <td className="px-4 py-2.5 text-right text-destructive font-semibold tabular-nums">
                      ₹ {Number(item.grandTotal || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrapper>
        ) : (
          <div className="text-center py-8 text-xs text-muted-foreground">No purchase returns recorded yet</div>
        )}
      </div>

      <CommonModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Purchase Return Saved"
      >
        <p className="mb-5 text-sm text-muted-foreground leading-relaxed">
          The Purchase Return has been recorded. Stock quantities and vendor payable balances have been updated.
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowSaveModal(false)}
            className="h-8 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </CommonModal>
    </div>
  );
}

export default PurchaseReturn;
