import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";

function Vendors() {
  // Bind to global Zustand store
  const vendors = useStore((state) => state.vendors);
  const loading = useStore((state) => state.loadingVendors);
  const fetchVendors = useStore((state) => state.fetchVendors);
  const addVendorStore = useStore((state) => state.addVendor);
  const updateVendorStore = useStore((state) => state.updateVendor);
  const deleteVendorStore = useStore((state) => state.deleteVendor);

  // Form State
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

  // Fetch/refresh on component mount (no-op if already cached)
  useEffect(() => {
    fetchVendors().catch((err) => {
      console.error("Failed to load vendors:", err);
      setMessage("Failed to load vendors from database.");
      setMessageType("error");
    });
  }, [fetchVendors]);

  // Add/Update Vendor Function
  const addVendor = async () => {
    if (!name || !mobile) {
      setMessage("Vendor Name and Mobile are required");
      setMessageType("error");
      return;
    }
    if (mobile.length !== 10) {
      setMessage("Mobile number must be 10 digits");
      setMessageType("error");
      return;
    }
    if (!pincode || pincode.length !== 6 || !/^[1-9][0-9]{5}$/.test(pincode)) {
      setMessage("Pincode must be exactly 6 digits and not start with 0");
      setMessageType("error");
      return;
    }
    if (gstin && gstin.length !== 15) {
      setMessage("GSTIN number must be 15 characters");
      setMessageType("error");
      return;
    }

    const mobileExists = vendors.some(
      (vendor) => vendor.mobile === mobile && vendor.id !== editId,
    );

    if (mobileExists) {
      setMessage("Mobile number already exists");
      setMessageType("warning");
      return;
    }

    const gstinExists = vendors.some(
      (vendor) =>
        vendor.gstin === gstin && vendor.gstin !== "" && vendor.id !== editId,
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
          gstin,
          pincode,
          openingBalance: parseFloat(openingBalance) || 0.0,
          creditLimit: parseFloat(creditLimit) || 0.0,
          contactPerson,
          creditDays: parseInt(creditDays) || 0,
        });
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
        setMessage("Vendor Updated Successfully");
        setMessageType("success");
      } catch (err) {
        console.error("Failed to update vendor:", err);
        setMessage(err.response?.data?.error || "Failed to update vendor in database.");
        setMessageType("error");
      }
      return;
    }

    try {
      await addVendorStore({
        name,
        mobile,
        gstin,
        address,
        pincode,
        openingBalance: parseFloat(openingBalance) || 0.0,
        creditLimit: parseFloat(creditLimit) || 0.0,
        contactPerson,
        creditDays: parseInt(creditDays) || 0,
      });

      setName("");
      setMobile("");
      setGstin("");
      setAddress("");
      setPincode("");
      setOpeningBalance("");
      setCreditLimit("");
      setContactPerson("");
      setCreditDays("");
      setMessage("Vendor Saved Successfully");
      setMessageType("success");
    } catch (err) {
      console.error("Failed to save vendor:", err);
      setMessage(err.response?.data?.message || "Failed to save vendor to database.");
      setMessageType("error");
    }
  };

  // Delete Vendor Function
  const deleteVendor = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this vendor?",
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteVendorStore(id);
      setMessage("Vendor Deleted Successfully");
      setMessageType("success");
    } catch (err) {
      console.error("Failed to delete vendor:", err);
      setMessage("Failed to delete vendor from database.");
      setMessageType("error");
    }
  };

  return (
    <div className="text-foreground">
      {/* Top Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Vendors</h1>
      </div>

      {/* Form */}
      <div className="bg-card text-foreground p-5 rounded-xl border border-border shadow-sm mb-6">
        <h2 className="text-xl font-bold mb-4 text-foreground">
          {editId !== null ? "Edit Vendor" : "Add Vendor"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Name */}
          <input
            type="text"
            placeholder="Vendor Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          {/* Mobile */}
          <input
            type="text"
            placeholder="Mobile Number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          {/* GSTIN */}
          <input
            type="text"
            placeholder="GSTIN Number"
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          {/* Address */}
          <input
            type="text"
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          {/* Opening Balance */}
          <input
            type="number"
            placeholder="Opening Balance"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          {/* Credit Limit */}
          <input
            type="number"
            placeholder="Credit Limit"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          {/* Contact Person */}
          <input
            type="text"
            placeholder="Contact Person"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          {/* Credit Days */}
          <input
            type="number"
            placeholder="Credit Days"
            value={creditDays}
            onChange={(e) => setCreditDays(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          {/* Pincode */}
          <input
            type="text"
            placeholder="Pincode (6 digits)"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={addVendor}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-3 rounded-lg font-semibold transition cursor-pointer shadow-sm"
          >
            {editId !== null ? "Update Vendor" : "Add Vendor"}
          </button>

          <button
            onClick={() => {
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
            }}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-5 py-3 rounded-lg font-semibold transition cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg mb-4 text-white font-medium shadow-sm transition ${
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
        <div className="flex items-center justify-center p-8 bg-card border border-border text-foreground rounded-xl shadow-sm">
          <svg className="animate-spin h-8 w-8 text-primary mr-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-muted-foreground font-medium">Loading vendors...</span>
        </div>
      ) : (
        <>
          <div className="bg-card text-foreground p-4 rounded-xl border border-border shadow-sm mb-4 w-64">
            <h3 className="text-muted-foreground text-sm font-semibold">Total Vendors</h3>
            <p className="text-3xl font-extrabold text-primary">{vendors.length}</p>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search Vendor"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg mb-4 w-full focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          {/* Table */}
          <div className="bg-card text-foreground rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary text-secondary-foreground border-b border-border">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">Sr No</th>
                  <th className="text-left p-4 font-semibold text-sm">Name</th>
                  <th className="text-left p-4 font-semibold text-sm">Mobile</th>
                  <th className="text-left p-4 font-semibold text-sm">GSTIN</th>
                  <th className="text-left p-4 font-semibold text-sm">Address</th>
                  <th className="text-left p-4 font-semibold text-sm">Pincode</th>
                  <th className="text-left p-4 font-semibold text-sm">Opening Balance</th>
                  <th className="text-left p-4 font-semibold text-sm">Credit Limit</th>
                  <th className="text-left p-4 font-semibold text-sm">Contact Person</th>
                  <th className="text-left p-4 font-semibold text-sm">Credit Days</th>
                  <th className="text-left p-4 font-semibold text-sm">Action</th>
                </tr>
              </thead>

              <tbody>
                {vendors
                  .filter((vendor) =>
                    vendor.name.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((vendor, index) => (
                    <tr
                      key={vendor.id}
                      className="border-t border-border hover:bg-muted/30 transition"
                    >
                      <td className="p-4 text-foreground">{index + 1}</td>
                      <td className="p-4 text-foreground font-semibold">{vendor.name}</td>
                      <td className="p-4 text-muted-foreground">{vendor.mobile}</td>
                      <td className="p-4 text-muted-foreground font-mono">{vendor.gstin || "N/A"}</td>
                      <td className="p-4 text-foreground">{vendor.address || "N/A"}</td>
                      <td className="p-4 text-foreground font-mono">{vendor.pincode || "N/A"}</td>
                      <td className="p-4 text-foreground">₹ {vendor.openingBalance || 0}</td>
                      <td className="p-4 text-foreground">₹ {vendor.creditLimit || 0}</td>
                      <td className="p-4 text-foreground">{vendor.contactPerson || "N/A"}</td>
                      <td className="p-4 text-foreground">{vendor.creditDays || "N/A"}</td>
 
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
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
                            className="bg-amber-500 text-white px-3 py-1 rounded mr-2 hover:bg-amber-600 transition cursor-pointer text-sm font-semibold shadow-sm"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteVendor(vendor.id)}
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

export default Vendors;
