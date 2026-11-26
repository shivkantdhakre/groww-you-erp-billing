import A4InvoiceTemplate from "./A4InvoiceTemplate";

/**
 * Printable A4 Purchase Bill sheet loading live purchase invoice data from the API.
 */
export default function PurchaseInvoicePrint() {
  return <A4InvoiceTemplate invoiceType="PURCHASE" />;
}
