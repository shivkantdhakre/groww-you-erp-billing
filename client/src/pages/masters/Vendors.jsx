import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import StatusBadge from "../../components/common/StatusBadge";
import { Loader2, Search, Pencil, Trash2, Truck, RotateCcw } from "lucide-react";

const INPUT_CLASS =
  "h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors";
const LABEL_CLASS =
  "block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

/**
 * Vendor directory & supplier GST master form with payment terms and delete confirmation.
 */
function Vendors() {
  const vendors = useStore((state) => state.vendors);
  const loading = useStore((state) => state.loadingVendors);
  const fetchVendors = useStore((state) => state.fetchVendors);
  const addVendorStore = useStore((state) => state.addVendor);
  const updateVendorStore = useStore((state) => state.updateVendor);
  const deleteVendorStore = useStore((state) => state.deleteVendor);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [creditDays, setCreditDays] = useState("");
  const [pincode, setPincode] = useState("");

  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchVendors().catch((err) => {
      console.error("Failed to load vendors:", err);
      setMessage("Failed to load vendors from database.");
      setMessageType("error");
    });
  }, [fetchVendors]);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setMobile("");
    setGstin("");
    setAddress("");
    setPincode("");
    setOpeningBalance("");
    setCreditLimit("");
    setContactPerson("");
    setCreditDays("");
  };

  const addVendor = async () => {
    if (!name || !mobile) {
      setMessage("Vendor Name and Mobile are required");
      setMessageType("error");
      return;
    }
    if (!/^[0-9]{10}$/.test(mobile)) {
      setMessage("Invalid Mobile Number (must be exactly 10 digits)");
      setMessageType("error");
      return;
    }
    if (!pincode || pincode.length !== 6 || !/^[1-9][0-9]{5}$/.test(pincode)) {
      setMessage("Pincode must be exactly 6 digits and not start with 0");
      setMessageType("error");
      return;
    }
    const trimmedGstin = gstin.trim().toUpperCase();
    if (trimmedGstin) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(trimmedGstin)) {
        setMessage(
          "Invalid GSTIN Number (must follow standard 15-character format, e.g. 29AAAAA1111A1Z1)"
        );
        setMessageType("error");
        return;
      }
    }

    const mobileExists = vendors.some(
      (vendor) => vendor.mobile === mobile && vendor.id !== editId
    );
    if (mobileExists) {
      setMessage("Mobile number already exists");
      setMessageType("warning");
      return;
    }

    const gstinExists = vendors.some(
      (vendor) => vendor.gstin === trimmedGstin && vendor.gstin !== "" && vendor.id !== editId
    );
    if (gstinExists) {
      setMessage("GSTIN number already exists");
      setMessageType("warning");
      return;
    }

    if (editId !== null) {
      try {
        await updateVendorStore(editId, {
          name,
          mobile,
          address,
          gstin: trimmedGstin,
          pincode,
          openingBalance: parseFloat(openingBalance) || 0.0,
          creditLimit: parseFloat(creditLimit) || 0.0,
          contactPerson,
          creditDays: parseInt(creditDays, 10) || 0,
        });
        resetForm();
        setMessage("Vendor updated successfully.");
        setMessageType("success");
      } catch (err) {
        console.error("Failed to update vendor:", err);
        const serverError = err.response?.data;
        let errMsg = "Failed to update vendor in database.";
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
      await addVendorStore({
        name,
        mobile,
        gstin: trimmedGstin,
        address,
        pincode,
        openingBalance: parseFloat(openingBalance) || 0.0,
        creditLimit: parseFloat(creditLimit) || 0.0,
        contactPerson,
        creditDays: parseInt(creditDays, 10) || 0,
      });

      resetForm();
      setMessage("Vendor saved successfully.");
      setMessageType("success");
    } catch (err) {
      console.error("Failed to save vendor:", err);
      const serverError = err.response?.data;
      let errMsg = "Failed to save vendor to database.";
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

  const confirmDeleteVendor = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteVendorStore(deleteTarget.id);
      setMessage("Vendor deleted successfully.");
      setMessageType("success");
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete vendor:", err);
      setMessage("Failed to delete vendor from database.");
      setMessageType("error");
    } finally {
      setDeleting(false);
    }
  };

  const filteredVendors = vendors.filter((vendor) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      vendor.name.toLowerCase().includes(q) ||
      (vendor.mobile || "").toLowerCase().includes(q) ||
      (vendor.gstin || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="Vendor Master"
        subtitle="Manage supplier profiles, GSTIN credentials, credit terms, and opening payable balances"
        badge={<StatusBadge variant="neutral tabular-nums">{vendors.length} vendors</StatusBadge>}
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
            {editId !== null ? "Edit Vendor Record" : "Add New Vendor"}
          </h2>
          {editId !== null && <StatusBadge variant="warning">Editing ID #{editId}</StatusBadge>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={LABEL_CLASS}>Vendor Name *</label>
            <input
              type="text"
              placeholder="e.g. Apex Steel Traders"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Mobile Number *</label>
            <input
              type="text"
              placeholder="10-digit mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className={`${INPUT_CLASS} font-mono tabular-nums`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>GSTIN (Optional)</label>
            <input
              type="text"
              placeholder="29AAAAA1111A1Z1"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              className={`${INPUT_CLASS} font-mono uppercase`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Address</label>
            <input
              type="text"
              placeholder="Street, city & state"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Pincode *</label>
            <input
              type="text"
              placeholder="6-digit pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className={`${INPUT_CLASS} font-mono tabular-nums`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Contact Person</label>
            <input
              type="text"
              placeholder="Account representative"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Opening Balance (₹)</label>
            <input
              type="number"
              placeholder="0.00"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              className={`${INPUT_CLASS} font-mono tabular-nums`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Credit Limit (₹)</label>
            <input
              type="number"
              placeholder="0.00"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className={`${INPUT_CLASS} font-mono tabular-nums`}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Credit Days</label>
            <input
              type="number"
              placeholder="30"
              value={creditDays}
              onChange={(e) => setCreditDays(e.target.value)}
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
            onClick={addVendor}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>{editId !== null ? "Update Vendor" : "Save Vendor"}</span>
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-card text-foreground rounded-lg border border-border surface-shadow overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Supplier Directory</h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              Showing {filteredVendors.length} of {vendors.length} vendors
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter name, mobile or GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-9 pr-3 rounded-md w-full border border-input bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary-text" />
            <span>Loading vendors...</span>
          </div>
        ) : filteredVendors.length > 0 ? (
          <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 w-14">#</th>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Mobile</th>
                  <th className="px-4 py-2.5">GSTIN</th>
                  <th className="px-4 py-2.5 hidden lg:table-cell">Contact Person</th>
                  <th className="px-4 py-2.5 hidden md:table-cell">Pincode</th>
                  <th className="px-4 py-2.5 text-right">Opening Bal</th>
                  <th className="px-4 py-2.5 text-right">Credit Limit</th>
                  <th className="px-4 py-2.5 text-right hidden sm:table-cell">Days</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredVendors.map((vendor, index) => (
                  <tr key={vendor.id} className="elevated-table-row transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
                      {index + 1}
                    </td>
                    <td className="px-4 py-2.5 text-foreground font-medium">{vendor.name}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground tabular-nums">
                      {vendor.mobile}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">
                      {vendor.gstin || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground hidden lg:table-cell">
                      {vendor.contactPerson || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground hidden md:table-cell tabular-nums">
                      {vendor.pincode || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-foreground tabular-nums whitespace-nowrap">
                      ₹ {Number(vendor.openingBalance || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-foreground tabular-nums whitespace-nowrap">
                      ₹ {Number(vendor.creditLimit || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground hidden sm:table-cell tabular-nums">
                      {vendor.creditDays || "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(vendor.id);
                            setName(vendor.name);
                            setMobile(vendor.mobile);
                            setGstin(vendor.gstin || "");
                            setAddress(vendor.address || "");
                            setPincode(vendor.pincode || "");
                            setOpeningBalance(vendor.openingBalance || "");
                            setCreditLimit(vendor.creditLimit || "");
                            setContactPerson(vendor.contactPerson || "");
                            setCreditDays(vendor.creditDays || "");
                          }}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-background hover:bg-secondary text-xs font-medium text-foreground transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(vendor)}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-xs font-medium text-muted-foreground transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
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
            No vendors matching your filter
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Vendor"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete Vendor"
        loading={deleting}
        onConfirm={confirmDeleteVendor}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
}

export default Vendors;
