import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// Conditional Puppeteer Loader based on OS & Environment
let puppeteer;
const isWindows = process.platform === 'win32';

// We dynamically import puppeteer or puppeteer-core depending on environment
// to optimize RAM in serverless/low-memory environments (like Render free tier).
const getBrowserInstance = async () => {
  if (isWindows) {
    // Local Windows uses standard puppeteer
    if (!puppeteer) {
      puppeteer = (await import('puppeteer')).default;
    }
    return await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  } else {
    // Production/Linux uses serverless puppeteer-core + sparticuz/chromium
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteerCore = (await import('puppeteer-core')).default;
    
    return await puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
  }
};

// S3 Client configuration for Supabase Storage (S3-compatible API)
let s3Client = null;
const isS3Configured = !!process.env.SUPABASE_S3_ENDPOINT;

if (isS3Configured) {
  s3Client = new S3Client({
    forcePathStyle: true, // Supabase requires true
    region: process.env.SUPABASE_S3_REGION || 'us-east-1',
    endpoint: process.env.SUPABASE_S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY || '',
      secretAccessKey: process.env.SUPABASE_S3_SECRET_KEY || ''
    }
  });
}

// Singleton browser helper class
class PDFService {
  constructor() {
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await getBrowserInstance();
      // Restart browser if disconnected
      this.browser.on('disconnected', () => {
        this.browser = null;
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Generate HTML from invoice data and format (A4 / Thermal)
  getHTMLContent(invoice, layout) {
    const isThermal = layout === 'Thermal';
    const isSale = invoice.invoiceType === 'SALE';
    const partyLabel = isSale ? 'Customer' : 'Vendor';
    const partyName = isSale ? invoice.customer?.name : invoice.vendor?.name;
    const partyMobile = isSale ? invoice.customer?.mobile : invoice.vendor?.mobile;
    const partyAddress = isSale ? invoice.customer?.address : invoice.vendor?.address;
    const partyGstin = isSale ? invoice.customer?.gstin : invoice.vendor?.gstin;
    
    const formattedDate = new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const itemsRows = invoice.items.map((line, index) => {
      const itemGstPct = line.gstPercentage || 0;
      const itemGstAmt = line.gstAmount || 0;
      const subtotalWithoutGst = (line.price * line.qty);
      
      if (isThermal) {
        return `
          <div class="thermal-item-row">
            <div>${index + 1}. ${line.item.name}</div>
            <div class="thermal-item-details">
              <span>${line.qty} x ₹${line.price.toFixed(2)}</span>
              <span>GST ${itemGstPct}% (₹${itemGstAmt.toFixed(2)})</span>
              <span><strong>₹${line.total.toFixed(2)}</strong></span>
            </div>
          </div>
        `;
      } else {
        return `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td><strong>${line.item.name}</strong>${line.item.sku ? ' <br><small>SKU: ' + line.item.sku + '</small>' : ''}</td>
            <td style="text-align: center;">${line.qty}</td>
            <td style="text-align: right;">₹${line.price.toFixed(2)}</td>
            <td style="text-align: center;">${itemGstPct}%</td>
            <td style="text-align: right;">₹${itemGstAmt.toFixed(2)}</td>
            <td style="text-align: right; font-weight: bold;">₹${line.total.toFixed(2)}</td>
          </tr>
        `;
      }
    }).join('');

    const totalGstAmount = invoice.items.reduce((sum, line) => sum + (line.gstAmount || 0), 0);
    const totalBeforeGst = invoice.grandTotal - totalGstAmount;

    if (isThermal) {
      // 80mm Layout (High Density)
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              width: 76mm;
              margin: 0 auto;
              padding: 4mm 2mm;
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
              background-color: #fff;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .header { margin-bottom: 4mm; }
            .company-name { font-size: 16px; font-weight: bold; margin: 0 0 1mm 0; text-transform: uppercase; }
            .company-details { font-size: 10px; margin: 0 0 1mm 0; }
            .divider { border-top: 1px dashed #000; margin: 2mm 0; }
            .details-table { width: 100%; font-size: 10px; margin-bottom: 2mm; }
            .details-table td { padding: 0.5mm 0; }
            .thermal-item-row { margin-bottom: 2mm; page-break-inside: avoid; }
            .thermal-item-details { display: flex; justify-content: space-between; font-size: 10px; padding-left: 3mm; margin-top: 0.5mm; }
            .totals-section { width: 100%; margin-top: 3mm; font-size: 11px; page-break-inside: avoid; }
            .totals-section td { padding: 1mm 0; }
            .grand-total { font-size: 14px; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
            .footer { margin-top: 5mm; font-size: 9px; }
          </style>
        </head>
        <body>
          <div class="header center">
            <h1 class="company-name">${invoice.company.name}</h1>
            <p class="company-details">
              ${invoice.company.address || ''}<br>
              ${invoice.company.mobileNumber ? 'Mob: ' + invoice.company.mobileNumber : ''}
              ${invoice.company.gstNumber ? ' | GSTIN: ' + invoice.company.gstNumber : ''}
            </p>
          </div>
          
          <div class="divider"></div>
          
          <table class="details-table">
            <tr><td><strong>Invoice No:</strong></td><td class="right">${invoice.invoiceNo}</td></tr>
            <tr><td><strong>Date:</strong></td><td class="right">${formattedDate}</td></tr>
            <tr><td><strong>${partyLabel}:</strong></td><td class="right">${partyName || 'Cash Sale'}</td></tr>
            ${partyMobile ? `<tr><td><strong>Mobile:</strong></td><td class="right">${partyMobile}</td></tr>` : ''}
            ${partyGstin ? `<tr><td><strong>GSTIN:</strong></td><td class="right">${partyGstin}</td></tr>` : ''}
          </table>
          
          <div class="divider"></div>
          
          <div class="items-list">
            ${itemsRows}
          </div>
          
          <div class="divider"></div>
          
          <table class="totals-section">
            <tr><td>Subtotal (Excl. GST)</td><td class="right">₹${totalBeforeGst.toFixed(2)}</td></tr>
            <tr><td>Total GST</td><td class="right">₹${totalGstAmount.toFixed(2)}</td></tr>
            <tr class="grand-total"><td>GRAND TOTAL</td><td class="right">₹${invoice.grandTotal.toFixed(2)}</td></tr>
          </table>
          
          <div class="footer center">
            <p>Thank You For Your Business!</p>
            <p>Software Powered by Groww You ERP</p>
          </div>
        </body>
        </html>
      `;
    } else {
      // Standard A4 Layout
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4;
              margin: 15mm 10mm 15mm 10mm;
            }
            body {
              font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
              font-size: 12px;
              color: #333;
              line-height: 1.5;
              margin: 0;
              padding: 0;
              background-color: #fff;
            }
            .invoice-box {
              max-width: 800px;
              margin: auto;
              padding: 0;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .company-title {
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              margin: 0 0 5px 0;
              letter-spacing: -0.5px;
            }
            .company-info {
              color: #64748b;
              font-size: 11px;
              line-height: 1.4;
            }
            .invoice-title-block {
              text-align: right;
            }
            .invoice-label {
              font-size: 20px;
              font-weight: 700;
              color: #0f172a;
              margin: 0 0 10px 0;
            }
            .meta-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
              background: #f8fafc;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
            }
            .meta-table td {
              padding: 12px 15px;
              vertical-align: top;
            }
            .section-title {
              font-weight: 700;
              font-size: 10px;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 6px;
              letter-spacing: 0.5px;
            }
            .meta-value {
              font-size: 12px;
              color: #1e293b;
              font-weight: 500;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            .items-table th {
              background: #0f172a;
              color: #fff;
              font-weight: 600;
              font-size: 11px;
              text-transform: uppercase;
              padding: 10px 12px;
              border: 1px solid #0f172a;
              letter-spacing: 0.5px;
            }
            .items-table td {
              padding: 10px 12px;
              border: 1px solid #e2e8f0;
              vertical-align: middle;
            }
            .totals-table-container {
              width: 100%;
              margin-top: 15px;
            }
            .totals-table {
              width: 40%;
              float: right;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .totals-table td {
              padding: 8px 12px;
              border: 1px solid #e2e8f0;
            }
            .totals-table tr.grand-total-row {
              background-color: #f1f5f9;
              font-weight: bold;
              font-size: 13px;
            }
            .clear {
              clear: both;
            }
            .footer-notes {
              margin-top: 50px;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
              font-size: 10px;
              color: #94a3b8;
              text-align: center;
            }
            .signature-block {
              width: 35%;
              float: right;
              text-align: center;
              margin-top: 40px;
            }
            .signature-line {
              border-top: 1px solid #94a3b8;
              margin-top: 40px;
              padding-top: 5px;
              font-weight: 600;
              color: #475569;
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <!-- Top Header -->
            <table class="header-table">
              <tr>
                <td>
                  <h1 class="company-title">${invoice.company.name}</h1>
                  <div class="company-info">
                    ${invoice.company.address || ''}<br>
                    ${invoice.company.mobileNumber ? 'Phone: ' + invoice.company.mobileNumber : ''}
                    ${invoice.company.gstNumber ? ' | GSTIN: ' + invoice.company.gstNumber : ''}
                  </div>
                </td>
                <td class="invoice-title-block">
                  <div class="invoice-label">${isSale ? 'TAX INVOICE' : 'PURCHASE ORDER'}</div>
                  <div class="company-info" style="font-size: 12px;">
                    <strong>Invoice No:</strong> ${invoice.invoiceNo}<br>
                    <strong>Date:</strong> ${formattedDate}
                  </div>
                </td>
              </tr>
            </table>

            <!-- Meta Details -->
            <table class="meta-table">
              <tr>
                <td style="width: 50%; border-right: 1px solid #e2e8f0;">
                  <div class="section-title">Billed To</div>
                  <div class="meta-value">
                    <strong>${partyName || 'Walk-in Cash Customer'}</strong><br>
                    ${partyAddress ? partyAddress + '<br>' : ''}
                    ${partyMobile ? 'Mobile: ' + partyMobile + '<br>' : ''}
                    ${partyGstin ? 'GSTIN: ' + partyGstin : ''}
                  </div>
                </td>
                <td style="width: 50%;">
                  <div class="section-title">Branch Location</div>
                  <div class="meta-value">
                    <strong>${invoice.branch.name}</strong><br>
                    ${invoice.branch.address || ''}<br>
                    ${invoice.branch.mobileNumber ? 'Phone: ' + invoice.branch.mobileNumber : ''}
                  </div>
                </td>
              </tr>
            </table>

            <!-- Items Table -->
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 6%; text-align: center;">#</th>
                  <th>Item Details</th>
                  <th style="width: 10%; text-align: center;">Qty</th>
                  <th style="width: 15%; text-align: right;">Unit Price</th>
                  <th style="width: 10%; text-align: center;">GST %</th>
                  <th style="width: 15%; text-align: right;">GST Amt</th>
                  <th style="width: 18%; text-align: right;">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <!-- Summary Block -->
            <div class="totals-table-container">
              <table class="totals-table">
                <tr>
                  <td>Subtotal (Excl. GST)</td>
                  <td style="text-align: right;">₹${totalBeforeGst.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Total GST</td>
                  <td style="text-align: right;">₹${totalGstAmount.toFixed(2)}</td>
                </tr>
                <tr class="grand-total-row">
                  <td>Grand Total</td>
                  <td style="text-align: right; color: #0f172a;">₹${invoice.grandTotal.toFixed(2)}</td>
                </tr>
              </table>
              
              <div class="signature-block">
                <br><br>
                <div class="signature-line">Authorized Signatory</div>
              </div>
              
              <div class="clear"></div>
            </div>

            <!-- Footer -->
            <div class="footer-notes">
              <p>This is a computer-generated document. No signature is required.</p>
              <p>Thank you for choosing ${invoice.company.name}!</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }
  }

  // Render HTML buffer into PDF
  async generatePDF(invoice, layout) {
    const htmlContent = this.getHTMLContent(invoice, layout);
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      let pdfOptions = {
        printBackground: true
      };

      if (layout === 'Thermal') {
        pdfOptions.width = '80mm';
        // Wait, for thermal, we can compute the body page height dynamically 
        // to avoid trailing white spaces on roll printers.
        const bodyHeight = await page.evaluate(() => document.documentElement.offsetHeight);
        // Add safety margins of 10mm
        pdfOptions.height = `${bodyHeight + 40}px`;
        pdfOptions.margin = { top: '2mm', bottom: '2mm', left: '2mm', right: '2mm' };
      } else {
        pdfOptions.format = 'A4';
        pdfOptions.margin = { top: '15mm', bottom: '15mm', left: '10mm', right: '10mm' };
      }

      const buffer = await page.pdf(pdfOptions);
      return buffer;
    } finally {
      await page.close();
    }
  }

  // Upload PDF buffer to Supabase Storage, with fallback to local files in dev
  async uploadPDF(invoice, pdfBuffer) {
    const fileName = `invoice-${invoice.id}-${Date.now()}.pdf`;
    
    if (isS3Configured) {
      try {
        const bucketName = process.env.SUPABASE_S3_BUCKET || 'invoices';
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
          // Supabase Storage uses public read permissions if bucket is public,
          // or we query signed URLs.
        });

        await s3Client.send(command);
        
        // Supabase S3 public url format:
        // https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[filename]
        const projectUrl = process.env.SUPABASE_S3_ENDPOINT.replace('/storage/v1/s3', '');
        const publicUrl = `${projectUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
        console.log(`Uploaded to Supabase Storage: ${publicUrl}`);
        return publicUrl;
      } catch (err) {
        console.error('Failed to upload to Supabase Storage S3 endpoint:', err);
        if (process.env.NODE_ENV === 'production') {
          return null; // Return null so the transaction survives and doesn't crash the server
        }
      }
    }

    // If we are in production and S3 is not configured/failed, return null
    if (process.env.NODE_ENV === 'production') {
      console.error('Supabase S3 storage is not configured in production. PDF URL left empty.');
      return null;
    }

    // LOCAL DEVELOPMENT FALLBACK
    // Save locally to server/public/invoices/ and return local dev URL
    try {
      const publicDir = path.join(process.cwd(), 'public');
      const invoicesDir = path.join(publicDir, 'invoices');
      
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
      if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir);
      
      const filePath = path.join(invoicesDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);
      
      // In dev, the server port is 5000
      const localUrl = `http://localhost:${process.env.PORT || 5000}/public/invoices/${fileName}`;
      console.log(`Saved locally in development mode: ${localUrl}`);
      return localUrl;
    } catch (localErr) {
      console.error('Failed to save PDF locally in development fallback:', localErr);
      return null;
    }
  }
}

const pdfService = new PDFService();
export default pdfService;
