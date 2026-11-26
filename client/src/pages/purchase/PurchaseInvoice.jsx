import { useState, useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import CommonModal from "../../components/common/CommonModal";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import Autocomplete from "../../components/common/Autocomplete";
import InvoiceOcrUpload from "../../components/purchase/InvoiceOcrUpload";
import { useStore } from "../../store/useStore";
import api from "../../utils/api";
import {
  Plus,
  Trash2,
  Printer,
  Save,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ExternalLink,
  Sparkles,
  X,
} from "lucide-react";

const ITEM_GRID_COLS =
  "grid grid-cols-[minmax(195px,1.8fr)_50px_72px_82px_48px_92px_40px] items-center gap-2";

/**
 * Virtualized purchase line-item table with synchronized CSS grid columns.
 */
function InvoiceTable({
  purchaseItems,
  items,
  updateItemDetails,
  clearItemDetails,
  updateItemQty,
  removeRow,
  addRow,
  itemSearchRefs,
  quantityRefs,
}) {
  const user = useStore((state) => state.user);
  const ROW_HEIGHT = 56;
  const MAX_VISIBLE_ROWS = 8;
  const parentRef = useRef(null);
  const shouldVirtualize = purchaseItems.length > MAX_VISIBLE_ROWS;

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: purchaseItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  });

  const virtualRows = shouldVirtualize
    ? virtualizer.getVirtualItems()
    : purchaseItems.map((_, index) => ({
        index,
        start: index * ROW_HEIGHT,
        size: ROW_HEIGHT,
      }));

  return (
    <div className="bg-card rounded-lg border border-border surface-shadow overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-border flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Purchase Line Items</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verify OCR-extracted line items or search catalog by item / SKU
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Add Row</span>
          <kbd className="hidden sm:inline ml-1 px-1 py-0.5 text-[10px] rounded bg-primary-foreground/15 font-mono">
            Alt+N
          </kbd>
        </button>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[630px]">
          <div
            className={`${ITEM_GRID_COLS} px-3.5 py-2.5 bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border`}
          >
            <div>Item / SKU</div>
            <div className="text-right">Stock</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Cost Rate</div>
            <div className="text-right">GST %</div>
            <div className="text-right">Line Total</div>
            <div className="text-center">Act</div>
          </div>

          <div
            ref={parentRef}
            className="overflow-y-auto scrollbar-thin divide-y divide-border/70"
            style={{
              maxHeight: shouldVirtualize ? `${MAX_VISIBLE_ROWS * ROW_HEIGHT}px` : undefined,
            }}
          >
            <div
              style={{
                height: shouldVirtualize ? `${virtualizer.getTotalSize()}px` : undefined,
                position: shouldVirtualize ? "relative" : undefined,
              }}
              className="divide-y divide-border/70"
            >
              {virtualRows.map((virtualRow) => {
                const item = purchaseItems[virtualRow.index];
                return (
                  <div
                    key={item.id}
                    className={`${ITEM_GRID_COLS} px-3.5 py-2 elevated-table-row transition-colors text-sm`}
                    style={
                      shouldVirtualize
                        ? {
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }
                        : undefined
                    }
                  >
                    <div className="min-w-0">
                      <Autocomplete
                        inputRef={(el) => {
                          if (el) {
                            itemSearchRefs.current[item.id] = el;
                          } else {
                            delete itemSearchRefs.current[item.id];
                          }
                        }}
                        options={items}
                        labelKey="name"
                        valueKey="id"
                        placeholder="Search item or SKU..."
                        selectedId={item.itemId}
                        value={item.itemName}
                        searchFields={["name", "sku"]}
                        customRender={(opt) => {
                          const stock = user?.branchId
                            ? opt.branchStocks?.find((b) => b.branchId === user.branchId)?.stock ?? 0
                            : opt.branchStocks?.reduce((sum, b) => sum + b.stock, 0) ?? 0;
                          return (
                            <div className="flex justify-between w-full gap-2 text-xs">
                              <span className="font-medium text-foreground truncate">{opt.name}</span>
                              <span className="text-muted-foreground font-mono tabular-nums shrink-0">
                                Stock: {stock} · ₹{opt.purchasePrice}
                              </span>
                            </div>
                          );
                        }}
                        onSelect={(opt) => updateItemDetails(item.id, opt)}
                        onClear={() => clearItemDetails(item.id)}
                      />
                    </div>

                    <div className="text-right font-mono text-xs font-semibold tabular-nums text-foreground">
                      {item.itemId ? item.currentStock : "-"}
                    </div>

                    <div className="flex justify-end">
                      <input
                        ref={(el) => {
                          if (el) {
                            quantityRefs.current[item.id] = el;
                          } else {
                            delete quantityRefs.current[item.id];
                          }
                        }}
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateItemQty(item.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const idx = virtualRow.index;
                            if (idx === purchaseItems.length - 1) {
                              addRow();
                            } else {
                              const nextRow = purchaseItems[idx + 1];
                              if (nextRow && itemSearchRefs.current[nextRow.id]) {
                                itemSearchRefs.current[nextRow.id].focus();
                              }
                            }
                          }
                        }}
                        className="h-9 pl-2 pr-1 rounded-md w-[70px] text-right border border-input bg-card text-foreground font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                      />
                    </div>

                    <div className="text-right font-mono text-xs font-medium text-foreground tabular-nums whitespace-nowrap">
                      {item.itemId || item.itemName || item.rate > 0
                        ? `₹ ${Number(item.rate || 0).toFixed(2)}`
                        : "-"}
                    </div>

                    <div className="text-right font-mono text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {item.itemId || item.itemName || item.gstPercentage > 0
                        ? `${Number(item.gstPercentage || 0)}%`
                        : "-"}
                    </div>

                    <div className="text-right font-mono text-xs sm:text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
                      {item.itemId || item.itemName || item.amount > 0
                        ? `₹ ${Number(item.amount || 0).toFixed(2)}`
                        : "-"}
                    </div>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => removeRow(item.id)}
                        title="Remove line item"
                        aria-label="Remove line item"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Vendor details and tax total summary panel for Purchase Invoice entry.
 */
function InvoiceSummaryCard({
  purchaseDate,
  setPurchaseDate,
  customInvoiceNo,
  setCustomInvoiceNo,
  vendorId,
  setVendorId,
  vendors,
  selectedVendor,
  totalItems,
  totalQty,
  subtotalAmount,
  gstAmount,
  grandTotal,
  savePurchase,
  vendorSearchRef,
}) {
  return (
    <div className="bg-card p-5 rounded-lg border border-border surface-shadow space-y-5 text-foreground">
      <div className="border-b border-border pb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Supplier Bill Summary</h2>
        <span className="text-[11px] font-mono text-muted-foreground">ITC Eligible</span>
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Vendor Invoice Ref
          </label>
          <input
            type="text"
            placeholder="e.g. VEN-9871 (Optional)"
            value={customInvoiceNo}
            onChange={(e) => setCustomInvoiceNo(e.target.value)}
            className="h-9 px-3 rounded-md w-full border border-input bg-card text-foreground font-mono text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
          />
        </div>

        <div>
          <label className="block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Purchase Date
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Vendor Name
            </label>
            <kbd className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">
              Alt+C
            </kbd>
          </div>
          <Autocomplete
            inputRef={vendorSearchRef}
            options={vendors}
            labelKey="name"
            valueKey="id"
            placeholder="Select vendor..."
            selectedId={vendorId}
            searchFields={["name", "mobile"]}
            customRender={(opt) => (
              <div className="flex justify-between w-full gap-2 text-xs">
                <span className="font-medium text-foreground truncate">{opt.name}</span>
                <span className="text-muted-foreground tabular-nums shrink-0">{opt.mobile}</span>
              </div>
            )}
            onSelect={(opt) => setVendorId(opt.id)}
            onClear={() => setVendorId(null)}
          />
        </div>

        <div>
          <label className="block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Vendor GSTIN
          </label>
          <input
            type="text"
            value={selectedVendor?.gstin || "N/A"}
            readOnly
            className="h-9 px-3 rounded-md w-full border border-border bg-muted text-muted-foreground font-mono text-xs cursor-not-allowed focus:outline-none"
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-secondary/40 p-4 rounded-md border border-border space-y-2 text-xs sm:text-sm">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Line Items / Qty</span>
          <span className="font-mono font-medium text-foreground tabular-nums">
            {totalItems} / {totalQty}
          </span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Taxable Subtotal</span>
          <span className="font-mono font-medium text-foreground tabular-nums">
            ₹ {subtotalAmount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Input GST</span>
          <span className="font-mono font-medium text-foreground tabular-nums">
            ₹ {gstAmount.toFixed(2)}
          </span>
        </div>
        <div className="border-t border-border pt-2.5 mt-2.5 flex justify-between items-baseline">
          <span className="font-semibold text-foreground">Grand Total</span>
          <span className="font-mono text-xl font-semibold text-success tabular-nums">
            ₹ {grandTotal.toFixed(2)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={savePurchase}
        className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors font-medium text-sm cursor-pointer flex items-center justify-center gap-2"
      >
        <Save className="w-4 h-4" />
        <span>Save Purchase Invoice</span>
        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary-foreground/15">
          F2
        </kbd>
      </button>

      <p className="text-[11px] text-muted-foreground text-center">
        Shortcuts: <span className="font-mono">Alt+N</span> row · <span className="font-mono">Ctrl+P</span> print last thermal
      </p>
    </div>
  );
}

function PurchaseInvoice() {
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [customInvoiceNo, setCustomInvoiceNo] = useState("");
  const [vendorId, setVendorId] = useState(null);

  const [purchaseItems, setPurchaseItems] = useState(() => [
    {
      id: Date.now(),
      itemId: "",
      itemName: "",
      qty: 1,
      rate: 0,
      gstPercentage: 0,
      amount: 0,
      currentStock: 0,
    },
  ]);

  const [ocrResult, setOcrResult] = useState(null);
  const [scannedFileUrl, setScannedFileUrl] = useState(null);
  const [ocrConfidenceScore, setOcrConfidenceScore] = useState(null);
  const [localFilePreviewUrl, setLocalFilePreviewUrl] = useState(null);
  const [localFileType, setLocalFileType] = useState(null);
  const [showMobilePreviewModal, setShowMobilePreviewModal] = useState(false);
  const [s3WarningMsg, setS3WarningMsg] = useState("");

  const [savedPurchases, setSavedPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  const vendorSearchRef = useRef(null);
  const itemSearchRefs = useRef({});
  const quantityRefs = useRef({});
  const [focusTarget, setFocusTarget] = useState(null);

  const vendors = useStore((state) => state.vendors);
  const items = useStore((state) => state.items);
  const fetchVendors = useStore((state) => state.fetchVendors);
  const fetchItems = useStore((state) => state.fetchItems);
  const user = useStore((state) => state.user);

  const fetchPurchaseInvoices = useCallback(async () => {
    setLoadingPurchases(true);
    try {
      const res = await api.get("/transactions/purchase-invoices");
      setSavedPurchases(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch purchase invoices:", err);
    } finally {
      setLoadingPurchases(false);
    }
  }, []);

  const handlePrintInvoice = useCallback(async (invoiceId, layout) => {
    if (layout.toLowerCase() === "thermal") {
      const width = 450;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      window.open(
        `/print/thermal-invoice/${invoiceId}?type=purchase`,
        "Thermal Invoice Print",
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );
      return;
    }
    try {
      const res = await api.get(`/pdf/invoices/${invoiceId}?layout=${layout}`);
      if (res.data.pdfUrl) {
        window.open(res.data.pdfUrl, "_blank");
      } else {
        setMessage("Failed to retrieve PDF invoice link.");
        setMessageType("error");
      }
    } catch (err) {
      console.error("Print Error:", err);
      setMessage("Error generating PDF invoice.");
      setMessageType("error");
    }
  }, []);

  const handleOcrSuccess = (resData, fileObj) => {
    setOcrResult(resData);
    setScannedFileUrl(resData.scannedFileUrl || null);
    setOcrConfidenceScore(resData.ocrConfidenceScore || 85);
    setS3WarningMsg(resData.s3Warning || "");

    if (fileObj) {
      const url = URL.createObjectURL(fileObj);
      setLocalFilePreviewUrl(url);
      setLocalFileType(fileObj.type);
    }

    const { vendor, invoiceNo, invoiceDate, items: extractedItems } = resData.data;

    if (vendor && vendor.matchedId) {
      setVendorId(vendor.matchedId);
    } else {
      setVendorId(null);
    }
    if (invoiceNo) {
      setCustomInvoiceNo(invoiceNo);
    }
    if (invoiceDate) {
      setPurchaseDate(invoiceDate);
    }
    if (extractedItems && extractedItems.length > 0) {
      setPurchaseItems(extractedItems);
    }

    setMessage("AI OCR extraction successful. Review prefilled fields against the source bill before saving.");
    setMessageType("success");
    setTimeout(() => setMessage(""), 5000);
  };

  const handleClearOcr = useCallback(() => {
    setOcrResult(null);
    setScannedFileUrl(null);
    setOcrConfidenceScore(null);
    if (localFilePreviewUrl) {
      URL.revokeObjectURL(localFilePreviewUrl);
    }
    setLocalFilePreviewUrl(null);
    setLocalFileType(null);
    setS3WarningMsg("");

    setVendorId(null);
    setCustomInvoiceNo("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setPurchaseItems([
      {
        id: Date.now(),
        itemId: "",
        itemName: "",
        qty: 1,
        rate: 0,
        gstPercentage: 0,
        amount: 0,
        currentStock: 0,
      },
    ]);
  }, [localFilePreviewUrl]);

  const selectedVendor = vendors.find((v) => v.id === vendorId);

  const savePurchase = useCallback(async () => {
    if (!purchaseDate) {
      setMessage("Purchase Date is required");
      setMessageType("error");
      return;
    }

    if (!vendorId) {
      setMessage("Vendor selection is required");
      setMessageType("error");
      return;
    }

    const hasInvalidItem = purchaseItems.some(
      (item) => !item.itemId || Number(item.qty) <= 0
    );

    if (hasInvalidItem) {
      setMessage("Please select a valid Item and enter Quantity for all rows");
      setMessageType("warning");
      return;
    }

    try {
      const payload = {
        vendorId,
        invoiceDate: purchaseDate,
        invoiceNo: customInvoiceNo || undefined,
        scannedFileUrl: scannedFileUrl || undefined,
        ocrConfidenceScore: ocrConfidenceScore || undefined,
        items: purchaseItems.map((item) => ({
          itemId: item.itemId,
          qty: item.qty,
        })),
      };

      await api.post("/transactions/purchase-invoices", payload);

      await fetchItems(true);
      await fetchVendors(true);
      fetchPurchaseInvoices();

      setVendorId(null);
      setCustomInvoiceNo("");
      handleClearOcr();
      setPurchaseItems([
        {
          id: Date.now(),
          itemId: "",
          itemName: "",
          qty: 1,
          rate: 0,
          gstPercentage: 0,
          amount: 0,
          currentStock: 0,
        },
      ]);

      setMessage("Purchase Invoice saved successfully.");
      setMessageType("success");
      setShowSaveModal(true);

      setTimeout(() => {
        setMessage("");
      }, 4000);
    } catch (err) {
      console.error("Failed to create purchase invoice:", err);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to save purchase invoice";
      setMessage(errorMsg);
      setMessageType("error");
    }
  }, [
    purchaseDate,
    vendorId,
    customInvoiceNo,
    purchaseItems,
    scannedFileUrl,
    ocrConfidenceScore,
    fetchItems,
    fetchVendors,
    fetchPurchaseInvoices,
    handleClearOcr,
  ]);

  const addRow = useCallback(() => {
    const newId = Date.now();
    const newRow = {
      id: newId,
      itemId: "",
      itemName: "",
      qty: 1,
      rate: 0,
      gstPercentage: 0,
      amount: 0,
      currentStock: 0,
    };
    setPurchaseItems((prev) => [...prev, newRow]);
    setFocusTarget({ id: newId, type: "item" });
  }, []);

  useEffect(() => {
    fetchVendors();
    fetchItems();
    const timer = setTimeout(() => {
      fetchPurchaseInvoices();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchVendors, fetchItems, fetchPurchaseInvoices]);

  useEffect(() => {
    if (focusTarget) {
      const { id, type } = focusTarget;
      const timer = setTimeout(() => {
        if (type === "item" && itemSearchRefs.current[id]) {
          itemSearchRefs.current[id].focus();
        } else if (type === "qty" && quantityRefs.current[id]) {
          quantityRefs.current[id].focus();
          quantityRefs.current[id].select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [focusTarget]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        addRow();
      }
      if (e.key === "F2") {
        e.preventDefault();
        savePurchase();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (savedPurchases.length > 0) {
          handlePrintInvoice(savedPurchases[0].id, "thermal");
        } else {
          setMessage("No invoices saved to print.");
          setMessageType("warning");
        }
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (vendorSearchRef.current) {
          vendorSearchRef.current.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [purchaseItems, savedPurchases, handlePrintInvoice, savePurchase, addRow]);

  const removeRow = (id) => {
    if (purchaseItems.length === 1) {
      setMessage("At least one item row is required");
      setMessageType("warning");
      return;
    }
    setPurchaseItems(purchaseItems.filter((item) => item.id !== id));
  };

  const updateItemDetails = (id, dbItem) => {
    const updatedItems = purchaseItems.map((item) => {
      if (item.id === id) {
        const qty = Number(item.qty) || 1;
        const rate = Number(dbItem.purchasePrice) || 0;
        const gstPct = Number(dbItem.gstPercentage) || 0;
        const subtotal = rate * qty;
        const gstAmount = Math.round(((subtotal * gstPct) / 100) * 100) / 100;
        const stock = user?.branchId
          ? dbItem.branchStocks?.find((b) => b.branchId === user.branchId)?.stock ?? 0
          : dbItem.branchStocks?.reduce((sum, b) => sum + b.stock, 0) ?? 0;
        return {
          ...item,
          itemId: dbItem.id,
          itemName: dbItem.name,
          rate,
          gstPercentage: gstPct,
          amount: Math.round((subtotal + gstAmount) * 100) / 100,
          currentStock: stock,
        };
      }
      return item;
    });
    setPurchaseItems(updatedItems);
    setFocusTarget({ id, type: "qty" });
  };

  const clearItemDetails = (id) => {
    setPurchaseItems(
      purchaseItems.map((item) =>
        item.id === id
          ? {
              ...item,
              itemId: "",
              itemName: "",
              rate: 0,
              gstPercentage: 0,
              amount: 0,
              currentStock: 0,
            }
          : item
      )
    );
  };

  const updateItemQty = (id, qtyValue) => {
    setPurchaseItems(
      purchaseItems.map((item) => {
        if (item.id === id) {
          const qty = parseInt(qtyValue, 10) || 0;
          const rate = Number(item.rate) || 0;
          const gstPct = Number(item.gstPercentage) || 0;
          const subtotal = rate * qty;
          const gstAmount = Math.round(((subtotal * gstPct) / 100) * 100) / 100;
          return {
            ...item,
            qty,
            amount: Math.round((subtotal + gstAmount) * 100) / 100,
          };
        }
        return item;
      })
    );
  };

  const subtotalAmount =
    Math.round(
      purchaseItems.reduce(
        (total, item) => total + (Number(item.rate) || 0) * (Number(item.qty) || 0),
        0
      ) * 100
    ) / 100;
  const grandTotal =
    Math.round(purchaseItems.reduce((total, item) => total + Number(item.amount), 0) * 100) / 100;
  const gstAmount = Math.max(0, Math.round((grandTotal - subtotalAmount) * 100) / 100);
  const totalItems = purchaseItems.length;
  const totalQty = purchaseItems.reduce((total, item) => total + (Number(item.qty) || 0), 0);

  const activeDocumentUrl = localFilePreviewUrl || scannedFileUrl;
  const isPdf =
    (localFileType && localFileType.includes("pdf")) ||
    (activeDocumentUrl &&
      (activeDocumentUrl.toLowerCase().includes(".pdf") ||
        activeDocumentUrl.startsWith("data:application/pdf")));

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Purchase Invoice"
        subtitle="Record supplier bills with AI OCR extraction, branch stock replenishment, and GST input credit tracking"
      />

      {/* AI OCR Upload Zone */}
      <InvoiceOcrUpload
        onOcrSuccess={handleOcrSuccess}
        onClearOcr={handleClearOcr}
        hasOcrData={Boolean(ocrResult)}
        ocrConfidenceScore={ocrConfidenceScore}
      />

      {/* S3 Warning */}
      {s3WarningMsg && (
        <div className="px-4 py-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{s3WarningMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setS3WarningMsg("")}
            aria-label="Dismiss warning"
            className="text-warning hover:opacity-80 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Human-in-the-Loop Banner */}
      {ocrResult && (
        <div className="px-4 py-3 rounded-lg bg-primary/10 border border-primary/25 text-foreground text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-primary-text">OCR Verification Active</p>
              <p className="text-xs text-muted-foreground">
                Verify supplier name, line quantities, and GST rates against the uploaded document before posting.
              </p>
            </div>
          </div>
          {activeDocumentUrl && (
            <button
              type="button"
              onClick={() => setShowMobilePreviewModal(true)}
              className="lg:hidden inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium shrink-0 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Source Bill</span>
            </button>
          )}
        </div>
      )}

      <ValidationMessage
        type={messageType}
        message={message}
        onDismiss={() => setMessage("")}
        className="mt-0!"
      />

      {/* Entry Workspace: Split-Screen when OCR document active */}
      {activeDocumentUrl ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Source Document Viewer */}
          <div className="hidden lg:flex lg:col-span-5 sticky top-16 bg-card p-4 rounded-lg border border-border surface-shadow h-[720px] flex-col">
            <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-border shrink-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-primary-text" />
                Source Document
              </span>
              <a
                href={activeDocumentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary-text hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="flex-1 w-full h-full min-h-0 overflow-hidden rounded-md border border-border bg-secondary/30 relative">
              {isPdf ? (
                <iframe
                  src={activeDocumentUrl}
                  title="Source PDF Document"
                  className="w-full h-full min-h-[640px] border-0"
                />
              ) : (
                <div className="w-full h-full overflow-y-auto p-2 flex flex-col items-center justify-start">
                  <img
                    src={activeDocumentUrl}
                    alt="Source Invoice"
                    className="w-full h-auto max-w-full object-contain rounded"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <InvoiceTable
              purchaseItems={purchaseItems}
              items={items}
              updateItemDetails={updateItemDetails}
              clearItemDetails={clearItemDetails}
              updateItemQty={updateItemQty}
              removeRow={removeRow}
              addRow={addRow}
              itemSearchRefs={itemSearchRefs}
              quantityRefs={quantityRefs}
            />

            <InvoiceSummaryCard
              purchaseDate={purchaseDate}
              setPurchaseDate={setPurchaseDate}
              customInvoiceNo={customInvoiceNo}
              setCustomInvoiceNo={setCustomInvoiceNo}
              vendorId={vendorId}
              setVendorId={setVendorId}
              vendors={vendors}
              selectedVendor={selectedVendor}
              totalItems={totalItems}
              totalQty={totalQty}
              subtotalAmount={subtotalAmount}
              gstAmount={gstAmount}
              grandTotal={grandTotal}
              savePurchase={savePurchase}
              vendorSearchRef={vendorSearchRef}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
          <div className="xl:col-span-2">
            <InvoiceTable
              purchaseItems={purchaseItems}
              items={items}
              updateItemDetails={updateItemDetails}
              clearItemDetails={clearItemDetails}
              updateItemQty={updateItemQty}
              removeRow={removeRow}
              addRow={addRow}
              itemSearchRefs={itemSearchRefs}
              quantityRefs={quantityRefs}
            />
          </div>

          <div className="xl:col-span-1">
            <InvoiceSummaryCard
              purchaseDate={purchaseDate}
              setPurchaseDate={setPurchaseDate}
              customInvoiceNo={customInvoiceNo}
              setCustomInvoiceNo={setCustomInvoiceNo}
              vendorId={vendorId}
              setVendorId={setVendorId}
              vendors={vendors}
              selectedVendor={selectedVendor}
              totalItems={totalItems}
              totalQty={totalQty}
              subtotalAmount={subtotalAmount}
              gstAmount={gstAmount}
              grandTotal={grandTotal}
              savePurchase={savePurchase}
              vendorSearchRef={vendorSearchRef}
            />
          </div>
        </div>
      )}

      {/* Mobile Document Preview Modal */}
      <CommonModal
        isOpen={showMobilePreviewModal}
        title="Source Document Preview"
        size="xl"
        onClose={() => setShowMobilePreviewModal(false)}
      >
        <div className="h-[460px] flex flex-col space-y-3">
          <div className="flex-1 overflow-hidden rounded-md border border-border bg-secondary/30">
            {isPdf ? (
              <iframe
                src={activeDocumentUrl}
                title="Mobile PDF Preview"
                className="w-full h-full border-0"
              />
            ) : (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-2">
                <img
                  src={activeDocumentUrl}
                  alt="Source Invoice"
                  className="max-w-full max-h-full object-contain rounded"
                />
              </div>
            )}
          </div>
          <div className="flex justify-between items-center pt-1">
            <a
              href={activeDocumentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary-text font-medium underline inline-flex items-center gap-1"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={() => setShowMobilePreviewModal(false)}
              className="h-8 px-3.5 rounded-md bg-secondary text-foreground text-xs font-medium border border-border cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </CommonModal>

      {/* Saved Purchase History Register */}
      <div className="bg-card rounded-lg border border-border surface-shadow overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Purchase History</h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {savedPurchases.length} bills
          </span>
        </div>

        {loadingPurchases ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            Loading purchase history...
          </div>
        ) : savedPurchases.length > 0 ? (
          <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Purchase No</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Vendor</th>
                  <th className="px-4 py-2.5 text-right">Items</th>
                  <th className="px-4 py-2.5 text-right">Qty</th>
                  <th className="px-4 py-2.5 text-right">Grand Total</th>
                  <th className="px-4 py-2.5 text-right">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {savedPurchases.map((purchase) => (
                  <tr key={purchase.id} className="elevated-table-row transition-colors">
                    <td className="px-4 py-2.5 text-foreground font-mono text-xs font-semibold">
                      {purchase.invoiceNo}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {new Date(purchase.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-foreground font-medium">
                      {purchase.vendor?.name || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {purchase.totalItems}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {purchase.totalQty}
                    </td>
                    <td className="px-4 py-2.5 text-right text-success font-mono font-semibold tabular-nums">
                      ₹ {Number(purchase.grandTotal || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(purchase.id, "A4")}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-background hover:bg-secondary text-xs font-medium text-primary-text transition-colors cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>A4</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintInvoice(purchase.id, "Thermal")}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-background hover:bg-secondary text-xs font-medium text-accent transition-colors cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>80mm</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrapper>
        ) : (
          <div className="text-center py-8 text-xs text-muted-foreground">
            No purchase invoices recorded yet
          </div>
        )}
      </div>

      <CommonModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Purchase Invoice Saved"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Purchase Invoice has been posted and inventory quantities have been incremented.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowSaveModal(false)}
              className="h-8 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </CommonModal>
    </div>
  );
}

export default PurchaseInvoice;
