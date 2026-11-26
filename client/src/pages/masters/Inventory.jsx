import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import StatusBadge from "../../components/common/StatusBadge";
import { Loader2, Search, Pencil, Trash2, PackagePlus, RotateCcw } from "lucide-react";

const INPUT_CLASS =
  "h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors";
const LABEL_CLASS =
  "block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

/**
 * Product & HSN catalog manager with branch-aware stock status and delete confirmation.
 */
function Inventory() {
  const items = useStore((state) => state.items);
  const loading = useStore((state) => state.loadingItems);
  const fetchItems = useStore((state) => state.fetchItems);
  const addItemStore = useStore((state) => state.addItem);
  const updateItemStore = useStore((state) => state.updateItem);
  const deleteItemStore = useStore((state) => state.deleteItem);
  const user = useStore((state) => state.user);
  const activeBranchId = useStore((state) => state.activeBranchId);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [gstPercentage, setGstPercentage] = useState("");
  const [unit, setUnit] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [openingStock, setOpeningStock] = useState("");
  const [minStockAlert, setMinStockAlert] = useState("10");

  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchItems().catch((err) => {
      console.error("Failed to load items:", err);
      setMessage("Failed to load items from database.");
      setMessageType("error");
    });
  }, [fetchItems]);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setSku("");
    setCategory("");
    setHsnCode("");
    setGstPercentage("");
    setUnit("");
    setPurchasePrice("");
    setSalePrice("");
    setOpeningStock("");
    setMinStockAlert("10");
  };

  const addItem = async () => {
    if (!name || !sku) {
      setMessage("Item Name and SKU/Code are required");
      setMessageType("error");
      return;
    }
    if (purchasePrice && Number(purchasePrice) < 0) {
      setMessage("Purchase Price cannot be negative");
      setMessageType("error");
      return;
    }
    if (salePrice && Number(salePrice) < 0) {
      setMessage("Sale Price cannot be negative");
      setMessageType("error");
      return;
    }
    if (openingStock && Number(openingStock) < 0) {
      setMessage("Opening Stock cannot be negative");
      setMessageType("error");
      return;
    }

    const itemExists = items.some((item) => item.sku === sku && item.id !== editId);
    if (itemExists) {
      setMessage("Item SKU/Code already exists");
      setMessageType("warning");
      return;
    }

    if (gstPercentage && !["0", "5", "12", "18", "28"].includes(String(gstPercentage))) {
      setMessage("GST % must be 0, 5, 12, 18 or 28");
      setMessageType("error");
      return;
    }

    if (editId !== null) {
      try {
        await updateItemStore(editId, {
          name,
          sku,
          category,
          unit,
          purchasePrice: parseFloat(purchasePrice) || 0.0,
          salePrice: parseFloat(salePrice) || 0.0,
          gstPercentage: parseFloat(gstPercentage) || 0.0,
          openingStock: parseInt(openingStock, 10) || 0,
          minStockAlert: parseInt(minStockAlert, 10) || 0,
          hsnCode,
        });
        resetForm();
        setMessage("Item updated successfully.");
        setMessageType("success");
      } catch (err) {
        console.error("Failed to update item:", err);
        const serverError = err.response?.data;
        let errMsg = "Failed to update item in database.";
        if (serverError) {
          if (serverError.error === "Validation failed" && Array.isArray(serverError.details)) {
            errMsg = `Validation failed: ${serverError.details
              .map((d) => `${d.field}: ${d.message}`)
              .join(", ")}`;
          } else {
            errMsg = serverError.message || serverError.error || errMsg;
          }
        }
        setMessage(errMsg);
        setMessageType("error");
      }
      return;
    }

    try {
      await addItemStore({
        name,
        sku,
        category,
        unit,
        purchasePrice: parseFloat(purchasePrice) || 0.0,
        salePrice: parseFloat(salePrice) || 0.0,
        gstPercentage: parseFloat(gstPercentage) || 0.0,
        openingStock: parseInt(openingStock, 10) || 0,
        minStockAlert: parseInt(minStockAlert, 10) || 10,
        hsnCode,
      });

      resetForm();
      setMessage("Item saved successfully.");
      setMessageType("success");
    } catch (err) {
      console.error("Failed to save item:", err);
      const serverError = err.response?.data;
      let errMsg = "Failed to save item to database.";
      if (serverError) {
        if (serverError.error === "Validation failed" && Array.isArray(serverError.details)) {
          errMsg = `Validation failed: ${serverError.details
            .map((d) => `${d.field}: ${d.message}`)
            .join(", ")}`;
        } else {
          errMsg = serverError.message || serverError.error || errMsg;
        }
      }
      setMessage(errMsg);
      setMessageType("error");
    }
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteItemStore(deleteTarget.id);
      setMessage("Item deleted successfully.");
      setMessageType("success");
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete item:", err);
      setMessage("Failed to delete item from database.");
      setMessageType("error");
    } finally {
      setDeleting(false);
    }
  };

  const getBranchStock = (item) => {
    const branchId = activeBranchId || user?.branchId;
    if (branchId) {
      return item.branchStocks?.find((b) => Number(b.branchId) === Number(branchId))?.stock ?? 0;
    }
    return item.branchStocks?.reduce((sum, b) => sum + b.stock, 0) ?? 0;
  };

  const filteredItems = items.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.sku || "").toLowerCase().includes(q) ||
      (item.category || "").toLowerCase().includes(q)
    );
  });

  const lowStockCount = items.filter(
    (item) => Number(getBranchStock(item)) < (item.minStockAlert || 10)
  ).length;

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Item Master & Inventory"
        subtitle="Manage SKUs, HSN tax slabs, purchase vs sale pricing, and reorder thresholds"
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge variant="neutral tabular-nums">{items.length} SKUs</StatusBadge>
            {lowStockCount > 0 && (
              <StatusBadge variant="warning tabular-nums">{lowStockCount} low stock</StatusBadge>
            )}
          </div>
        }
      />

      <ValidationMessage
        type={messageType}
        message={message}
        onDismiss={() => setMessage("")}
        className="mt-0!"
      />

      {/* Entry / Edit Card */}
      <div className="bg-card text-foreground p-5 rounded-lg border border-border surface-shadow">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/70">
          <h2 className="text-sm font-semibold text-foreground">
            {editId !== null ? "Edit Product Specification" : "Add New Inventory Item"}
          </h2>
          {editId !== null && <StatusBadge variant="warning">Editing ID #{editId}</StatusBadge>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Item Name *</label>
            <input
              type="text"
              placeholder="e.g. Copper Coil 12mm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div className="lg:col-span-2">
            <label className={LABEL_CLASS}>SKU / Barcode *</label>
            <input
              type="text"
              placeholder="e.g. SKU-1042"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className={`${INPUT_CLASS} font-mono`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Category</label>
            <input
              type="text"
              placeholder="e.g. Electrical"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>HSN Code</label>
            <input
              type="text"
              placeholder="e.g. 8544"
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
              className={`${INPUT_CLASS} font-mono`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>GST Slab (%)</label>
            <input
              type="number"
              placeholder="0, 5, 12, 18, 28"
              value={gstPercentage}
              onChange={(e) => setGstPercentage(e.target.value)}
              className={`${INPUT_CLASS} font-mono tabular-nums`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Unit</label>
            <input
              type="text"
              placeholder="Pcs, Box, Kg"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Purchase Price (₹)</label>
            <input
              type="number"
              placeholder="0.00"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className={`${INPUT_CLASS} font-mono tabular-nums`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Sale Price (₹)</label>
            <input
              type="number"
              placeholder="0.00"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className={`${INPUT_CLASS} font-mono tabular-nums`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Opening Stock</label>
            <input
              type="number"
              placeholder="0"
              title="Opening Stock"
              value={openingStock}
              onChange={(e) => setOpeningStock(e.target.value)}
              disabled={editId !== null}
              className={`${INPUT_CLASS} font-mono tabular-nums ${
                editId !== null ? "opacity-50 cursor-not-allowed bg-muted" : ""
              }`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Min Stock Alert</label>
            <input
              type="number"
              placeholder="10"
              title="Minimum Stock Alert"
              value={minStockAlert}
              onChange={(e) => setMinStockAlert(e.target.value)}
              className={`${INPUT_CLASS} font-mono tabular-nums`}
            />
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-border/70 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-medium transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <PackagePlus className="w-4 h-4" />
            <span>{editId !== null ? "Update Item" : "Save Item"}</span>
          </button>
        </div>
      </div>

      {/* Inventory Catalog Table */}
      <div className="bg-card text-foreground rounded-lg border border-border surface-shadow overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Inventory Catalog</h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              Showing {filteredItems.length} of {items.length} products
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter name, SKU or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-9 pr-3 rounded-md w-full border border-input bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary-text" />
            <span>Loading inventory...</span>
          </div>
        ) : filteredItems.length > 0 ? (
          <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-2.5 py-2.5 w-10">#</th>
                  <th className="px-2.5 py-2.5">Item Name</th>
                  <th className="px-2.5 py-2.5">SKU</th>
                  <th className="px-2.5 py-2.5 hidden xl:table-cell">Category</th>
                  <th className="px-2.5 py-2.5 hidden 2xl:table-cell">HSN</th>
                  <th className="px-2.5 py-2.5 text-right">GST</th>
                  <th className="px-2.5 py-2.5 text-right">Purchase</th>
                  <th className="px-2.5 py-2.5 text-right">Sale</th>
                  <th className="px-2.5 py-2.5 text-right">Stock</th>
                  <th className="px-2.5 py-2.5">Status</th>
                  <th className="px-2.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredItems.map((item, index) => {
                  const activeBranchStock = getBranchStock(item);
                  const isLow = Number(activeBranchStock) < (item.minStockAlert || 10);

                  return (
                    <tr key={item.id} className="elevated-table-row transition-colors">
                      <td className="px-2.5 py-2.5 text-xs text-muted-foreground tabular-nums">
                        {index + 1}
                      </td>
                      <td className="px-2.5 py-2.5 text-foreground font-medium">
                        <div>{item.name}</div>
                        <div className="text-[11px] text-muted-foreground xl:hidden">
                          {item.category || "General"}
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5 text-xs text-muted-foreground font-mono">
                        {item.sku || "-"}
                      </td>
                      <td className="px-2.5 py-2.5 text-xs text-muted-foreground hidden xl:table-cell">
                        {item.category || "-"}
                      </td>
                      <td className="px-2.5 py-2.5 text-xs text-muted-foreground font-mono hidden 2xl:table-cell">
                        {item.hsnCode || "-"}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {item.gstPercentage || 0}%
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono text-xs text-foreground tabular-nums whitespace-nowrap">
                        ₹ {Number(item.purchasePrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono text-xs font-medium text-foreground tabular-nums whitespace-nowrap">
                        ₹ {Number(item.salePrice || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono text-xs font-semibold text-foreground tabular-nums whitespace-nowrap">
                        {activeBranchStock} {item.unit ? <span className="font-normal text-muted-foreground">{item.unit}</span> : null}
                      </td>
                      <td className="px-2.5 py-2.5 whitespace-nowrap">
                        {isLow ? (
                          <StatusBadge variant="destructive">Low Stock</StatusBadge>
                        ) : (
                          <StatusBadge variant="success">In Stock</StatusBadge>
                        )}
                      </td>
                      <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditId(item.id);
                              setName(item.name);
                              setSku(item.sku || "");
                              setCategory(item.category || "");
                              setHsnCode(item.hsnCode || "");
                              setGstPercentage(item.gstPercentage || "");
                              setUnit(item.unit || "");
                              setPurchasePrice(item.purchasePrice || "");
                              setSalePrice(item.salePrice || "");
                              setOpeningStock(item.openingStock || "");
                              setMinStockAlert(item.minStockAlert || "10");
                            }}
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-background hover:bg-secondary text-xs font-medium text-foreground transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-xs font-medium text-muted-foreground transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrapper>
        ) : (
          <div className="text-center py-8 text-xs text-muted-foreground">
            No items matching your search
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Item"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}" (${deleteTarget.sku})?`
            : ""
        }
        confirmLabel="Delete Item"
        loading={deleting}
        onConfirm={confirmDeleteItem}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
}

export default Inventory;
