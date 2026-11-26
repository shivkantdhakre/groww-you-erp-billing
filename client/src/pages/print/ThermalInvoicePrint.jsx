import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../../utils/api";

function ThermalInvoicePrint() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "sale";

  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const endpoint = type === "purchase"
          ? `/transactions/purchase-invoices/${id}`
          : `/transactions/sales-invoices/${id}`;

        const [invRes, compRes] = await Promise.all([
          api.get(endpoint),
          api.get("/company")
        ]);
        setInvoice(invRes.data);
        setCompany(compRes.data);
        setError("");
      } catch (err) {
        console.error("Failed to load thermal invoice data:", err);
        setError("Failed to fetch receipt data.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id, type]);

  useEffect(() => {
    if (invoice && company && !loading && !error) {
      // Small timeout to ensure DOM has rendered completely before triggering print dialog
      const timer = setTimeout(() => {
        window.print();
      }, 500);

      const handleAfterPrint = () => {
        window.close();
      };

      window.addEventListener("afterprint", handleAfterPrint);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("afterprint", handleAfterPrint);
      };
    }
  }, [invoice, company, loading, error]);

  if (loading) {
    return <div className="p-4 text-center font-mono text-xs">Loading receipt&hellip;</div>;
  }

  if (error || !invoice) {
    return <div className="p-4 text-center font-mono text-xs text-destructive">{error || "Invoice not found"}</div>;
  }

  // Calculate SGST and CGST (split from GST total)
  const itemsWithTax = invoice.items.map((line) => {
    const qty = line.qty;
    const rate = line.price; // Base selling rate
    const subtotal = rate * qty;
    const gstPct = line.gstPercentage;
    const gstAmount = line.gstAmount || Math.round((subtotal * gstPct / 100) * 100) / 100;

    return {
      ...line,
      subtotal,
      gstAmount,
      cgstPct: gstPct / 2,
      cgstAmount: gstAmount / 2,
      sgstPct: gstPct / 2,
      sgstAmount: gstAmount / 2,
    };
  });

  const totalGst = itemsWithTax.reduce((sum, item) => sum + item.gstAmount, 0);
  const totalTaxable = itemsWithTax.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="thermal-receipt font-mono p-4 mx-auto select-none bg-white text-black" style={{ width: "80mm" }}>
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            width: 80mm;
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
        body {
          background: #EAE6DF;
        }
      `}</style>

      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-base font-bold uppercase tracking-wide">{company?.name || "GROWW YOU ERP"}</h2>
        {company?.address && <p className="text-[10px] leading-tight">{company.address}</p>}
        {company?.mobileNumber && <p className="text-[10px]">Mobile: {company.mobileNumber}</p>}
        {company?.gstNumber && <p className="text-[10px] font-semibold">GSTIN: {company.gstNumber}</p>}
        <div className="border-t border-dashed border-black my-2"></div>
        <p className="text-xs font-bold uppercase tracking-wider">
          {type === "purchase" ? "PURCHASE CASH MEMO" : "SALES CASH MEMO"}
        </p>
        <div className="border-t border-dashed border-black my-2"></div>
      </div>

      {/* Invoice metadata */}
      <div className="text-[10px] space-y-1 my-2">
        <div className="flex justify-between">
          <span>Bill No: <strong className="text-xs">{invoice.invoiceNo}</strong></span>
          <span>Date: {new Date(invoice.invoiceDate).toLocaleDateString()}</span>
        </div>
        {type === "purchase" ? (
          <>
            <div className="flex justify-between">
              <span>Vend: {invoice.vendor?.name || "Cash Vendor"}</span>
              {invoice.vendor?.mobile && <span>Mob: {invoice.vendor.mobile}</span>}
            </div>
            {invoice.vendor?.gstin && <div>GSTIN: {invoice.vendor.gstin}</div>}
          </>
        ) : (
          <>
            <div className="flex justify-between">
              <span>Cust: {invoice.customer?.name || "Walk-in Customer"}</span>
              {invoice.customer?.mobile && <span>Mob: {invoice.customer.mobile}</span>}
            </div>
            {invoice.customer?.gstin && <div>GSTIN: {invoice.customer.gstin}</div>}
          </>
        )}
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Items Table */}
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="border-b border-dashed border-black">
            <th className="text-left py-1 font-bold">Item Description</th>
            <th className="text-right py-1 font-bold w-12">Qty</th>
            <th className="text-right py-1 font-bold w-16">Rate</th>
            <th className="text-right py-1 font-bold w-16">Total</th>
          </tr>
        </thead>
        <tbody>
          {itemsWithTax.map((line, idx) => (
            <tr key={idx} className="align-top">
              <td className="py-1">
                <span className="block font-medium">{line.item?.name}</span>
                <span className="text-[9px] text-gray-700 block">GST {line.gstPercentage}%</span>
              </td>
              <td className="text-right py-1 font-semibold">{line.qty}</td>
              <td className="text-right py-1">₹{line.price.toFixed(2)}</td>
              <td className="text-right py-1 font-bold">₹{line.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Totals and tax breakdown */}
      <div className="text-[10px] space-y-1">
        <div className="flex justify-between">
          <span>Taxable Amount:</span>
          <span>₹{totalTaxable.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>CGST Total:</span>
          <span>₹{(totalGst / 2).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>SGST Total:</span>
          <span>₹{(totalGst / 2).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs font-extrabold border-t border-dashed border-black pt-2">
          <span>GRAND TOTAL:</span>
          <span>₹{invoice.grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-black my-3"></div>

      {/* Footer */}
      <div className="text-center space-y-1">
        <p className="text-[10px] font-bold">Thank You & Visit Again!</p>
        <p className="text-[9px] italic">Powered by Groww You ERP</p>
        <div className="h-6"></div>
      </div>
    </div>
  );
}

export default ThermalInvoicePrint;
