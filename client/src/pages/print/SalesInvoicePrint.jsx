import A4InvoiceTemplate from "./A4InvoiceTemplate";

/**
 * Printable A4 Tax Invoice sheet loading live sales invoice data from the API.
 */
function SalesInvoicePrint() {
  return <A4InvoiceTemplate invoiceType="SALE" />;
}

export default SalesInvoicePrint;
