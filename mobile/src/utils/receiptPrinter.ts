import * as Print from 'expo-print';
import { useStore } from '../store/useStore';

export const printThermalReceipt = async (invoice: any): Promise<void> => {
  const customerName = invoice.customer?.name || 'Retail Customer';
  const customerMobile = invoice.customer?.mobile || 'N/A';
  const customerGSTIN = invoice.customer?.gstin || 'N/A';
  const invoiceNo = invoice.invoiceNo || 'N/A';
  const invoiceDate = invoice.invoiceDate 
    ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN') 
    : 'N/A';
  
  // Resolve branch details from Zustand store branches cache
  const branches = useStore.getState().branches;
  const invoiceBranch = branches.find((b) => b.id === invoice.branchId);
  const branchName = invoiceBranch?.name || 'HQ - Main Branch';
  const branchAddress = invoiceBranch?.address || '';
  const branchMobile = invoiceBranch?.mobileNumber || '';

  const itemsHtml = (invoice.items || []).map((line: any) => {
    const itemName = line.item?.name || 'Product';
    const qty = line.qty || 0;
    const rate = line.price || 0;
    const total = line.total || 0;
    return `
      <tr>
        <td colspan="4" style="font-weight: bold; padding-top: 5px; word-break: break-all;">${itemName}</td>
      </tr>
      <tr>
        <td style="padding-bottom: 5px;">${qty} pcs</td>
        <td style="padding-bottom: 5px; text-align: right;">₹${rate.toFixed(2)}</td>
        <td style="padding-bottom: 5px; text-align: right;">${line.gstPercentage}%</td>
        <td style="padding-bottom: 5px; text-align: right; font-weight: bold;">₹${total.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const subtotal = (invoice.items || []).reduce((sum: number, line: any) => sum + (line.price * line.qty), 0);
  const gstTotal = (invoice.items || []).reduce((sum: number, line: any) => sum + (line.gstAmount || 0), 0);
  const grandTotal = invoice.grandTotal || 0;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          @page { margin: 0; size: 80mm 200mm; } /* Forces thermal roll dimensions */
          body { 
            width: 70mm; /* Account for margins */
            font-family: 'Courier New', Courier, monospace; 
            font-size: 11px; 
            margin: 0; 
            padding: 3mm; 
            color: black; 
            background-color: white;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .title { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
          .subtitle { font-size: 10px; margin-bottom: 10px; }
          .divider { border-top: 1px dashed black; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; }
          th { border-bottom: 1px dashed black; padding: 4px 0; font-weight: bold; text-align: left; }
          td { padding: 2px 0; vertical-align: top; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="title">GROWW YOU ERP</div>
          <div class="subtitle">${branchName}</div>
          ${branchAddress ? `<div style="font-size: 9px;">${branchAddress}</div>` : ''}
          ${branchMobile ? `<div style="font-size: 9px;">Ph: ${branchMobile}</div>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div>
          <span class="bold">Inv No :</span> ${invoiceNo}<br/>
          <span class="bold">Date   :</span> ${invoiceDate}<br/>
        </div>
        
        <div class="divider"></div>
        
        <div>
          <span class="bold">Customer:</span> ${customerName}<br/>
          <span class="bold">Mobile  :</span> ${customerMobile}<br/>
          ${customerGSTIN !== 'N/A' && customerGSTIN ? `<span class="bold">GSTIN   :</span> ${customerGSTIN}<br/>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Qty</th>
              <th style="width: 30%; text-align: right;">Rate</th>
              <th style="width: 15%; text-align: right;">GST</th>
              <th style="width: 30%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="text-right">₹${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Tax (GST):</td>
            <td class="text-right">₹${gstTotal.toFixed(2)}</td>
          </tr>
          <tr class="bold" style="font-size: 12px;">
            <td>GRAND TOTAL:</td>
            <td class="text-right">₹${grandTotal.toFixed(2)}</td>
          </tr>
        </table>
        
        <div class="divider"></div>
        
        <div class="text-center" style="margin-top: 15px; font-weight: bold;">
          THANK YOU! VISIT AGAIN
        </div>
      </body>
    </html>
  `;

  await Print.printAsync({ html });
};
