import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";

function Inventory() {
  // Bind to global Zustand store
  const items = useStore((state) => state.items);
  const loading = useStore((state) => state.loadingItems);
  const fetchItems = useStore((state) => state.fetchItems);
  const addItemStore = useStore((state) => state.addItem);
  const updateItemStore = useStore((state) => state.updateItem);
  const deleteItemStore = useStore((state) => state.deleteItem);

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

  // Fetch/refresh on component mount (no-op if already cached)
  useEffect(() => {
    fetchItems().catch((err) => {
      console.error("Failed to load items:", err);
      setMessage("Failed to load items from database.");
      setMessageType("error");
    });
  }, [fetchItems]);

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

    const itemExists = items.some(
      (item) => item.sku === sku && item.id !== editId,
    );

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
          openingStock: parseInt(openingStock) || 0,
          minStockAlert: parseInt(minStockAlert) || 0,
          hsnCode,
        });
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
        setMessage("Item Updated Successfully");
        setMessageType("success");
      } catch (err) {
        console.error("Failed to update item:", err);
        setMessage(err.response?.data?.error || "Failed to update item in database.");
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
        openingStock: parseInt(openingStock) || 0,
        minStockAlert: parseInt(minStockAlert) || 10,
        hsnCode,
      });

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
      setMessage("Item Saved Successfully");
      setMessageType("success");
    } catch (err) {
      console.error("Failed to save item:", err);
      setMessage(err.response?.data?.message || "Failed to save item to database.");
      setMessageType("error");
    }
  };

  const deleteItem = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this item?",
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteItemStore(id);
      setMessage("Item Deleted Successfully");
      setMessageType("success");
    } catch (err) {
      console.error("Failed to delete item:", err);
      setMessage("Failed to delete item from database.");
      setMessageType("error");
    }
  };


  return (
    <div className="text-foreground">
      <h1 className="text-3xl font-bold">Inventory</h1>
      <div className="bg-card text-foreground p-5 rounded-xl border border-border shadow-sm mt-6">
        <h2 className="text-xl font-bold mb-4 text-foreground">
          {editId !== null ? "Edit Item Master" : "Add Item Master"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Item Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          <input
            type="text"
            placeholder="SKU / Item Code"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          <input
            type="text"
            placeholder="HSN Code"
            value={hsnCode}
            onChange={(e) => setHsnCode(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          <input
            type="number"
            placeholder="GST %"
            value={gstPercentage}
            onChange={(e) => setGstPercentage(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          <input
            type="text"
            placeholder="Unit (e.g. Pcs, Box, Kg)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          <input
            type="number"
            placeholder="Purchase Price"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          <input
            type="number"
            placeholder="Sale Price"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          <input
            type="number"
            placeholder="Opening Stock"
            value={openingStock}
            onChange={(e) => setOpeningStock(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          <input
            type="number"
            placeholder="Min Stock Alert"
            value={minStockAlert}
            onChange={(e) => setMinStockAlert(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={addItem}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-3 rounded-lg font-semibold transition cursor-pointer shadow-sm"
          >
            {editId !== null ? "Update Item" : "Add Item"}
          </button>
          <button
            onClick={() => {
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
            }}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-5 py-3 rounded-lg font-semibold transition cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg mb-4 text-white mt-4 font-medium shadow-sm transition ${
            messageType === "success"
              ? "bg-emerald-600"
              : messageType === "warning"
              ? "bg-amber-500"
              : "bg-destructive"
          }`}
        >
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-8 bg-card border border-border text-foreground rounded-xl shadow-sm mt-4">
          <svg className="animate-spin h-8 w-8 text-primary mr-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-muted-foreground font-medium">Loading inventory...</span>
        </div>
      ) : (
        <>
          {/* Inventory Count Card */}
          <div className="bg-card text-foreground p-4 rounded-xl border border-border shadow-sm mb-4 mt-4 w-72">
            <h3 className="text-muted-foreground text-sm font-semibold">Total Items</h3>
            <p className="text-3xl font-extrabold text-primary">{items.length}</p>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search Item"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg mb-4 w-full focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          <div className="bg-card text-foreground rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary text-secondary-foreground border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">Sr No</th>
                  <th className="text-left p-4 font-semibold text-sm">Item Name</th>
                  <th className="text-left p-4 font-semibold text-sm">SKU / Code</th>
                  <th className="text-left p-4 font-semibold text-sm">Category</th>
                  <th className="text-left p-4 font-semibold text-sm">HSN</th>
                  <th className="text-left p-4 font-semibold text-sm">GST %</th>
                  <th className="text-left p-4 font-semibold text-sm">Unit</th>
                  <th className="text-left p-4 font-semibold text-sm">Purchase Price</th>
                  <th className="text-left p-4 font-semibold text-sm">Sale Price</th>
                  <th className="text-left p-4 font-semibold text-sm">Opening Stock</th>
                  <th className="text-left p-4 font-semibold text-sm">Stock Status</th>
                  <th className="text-left p-4 font-semibold text-sm">Action</th>
                </tr>
              </thead>

              <tbody>
                {items
                  .filter((item) =>
                    item.name.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-t border-border hover:bg-muted/30 transition"
                    >
                      <td className="p-4 text-foreground">{index + 1}</td>
                      <td className="p-4 text-foreground font-semibold">{item.name}</td>
                      <td className="p-4 text-muted-foreground font-mono">{item.sku || "N/A"}</td>
                      <td className="p-4 text-foreground">{item.category || "N/A"}</td>
                      <td className="p-4 text-muted-foreground font-mono">{item.hsnCode || "N/A"}</td>
                      <td className="p-4 text-foreground">{item.gstPercentage || 0}%</td>
                      <td className="p-4 text-foreground">{item.unit}</td>
                      <td className="p-4 text-foreground">₹ {item.purchasePrice}</td>
                      <td className="p-4 text-foreground">₹ {item.salePrice}</td>
                      <td className="p-4 text-foreground">{item.openingStock}</td>
                      <td className="p-4">
                        {Number(item.openingStock) < (item.minStockAlert || 10) ? (
                          <span className="bg-destructive/10 text-destructive px-3 py-1 rounded-full text-xs font-bold">
                            Low Stock
                          </span>
                        ) : (
                          <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold">
                            In Stock
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
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
                            className="bg-amber-500 text-white px-3 py-1 rounded mr-2 hover:bg-amber-600 transition cursor-pointer text-sm font-semibold shadow-sm"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteItem(item.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-3 py-1 rounded transition cursor-pointer text-sm font-semibold shadow-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default Inventory;

