import { PDFDocument } from 'pdf-lib';
import Fuse from 'fuse.js';
import prisma from '../utils/prisma.js';
import { parseInvoiceOCR } from '../utils/geminiService.js';
import { uploadInvoiceToS3 } from '../utils/s3Service.js';

/**
 * Controller to handle OCR document parsing (PDF / PNG / JPEG).
 * Performs validation, Gemini Vision extraction, sequential S3 backup, and tenant fuzzy data matching.
 */
export const processInvoiceOCR = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No document file uploaded" });
    }

    const { buffer, mimetype, originalname, size } = req.file;

    // 1. File Size Guard (5MB limit)
    if (size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "File size exceeds 5MB limit. Please upload a smaller receipt or invoice." });
    }

    // 2. PDF Page Count & Corruption Check using pdf-lib
    if (mimetype === 'application/pdf') {
      try {
        const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pageCount = pdfDoc.getPageCount();
        if (pageCount > 3) {
          return res.status(400).json({
            error: `Invoices must be 3 pages or fewer. The uploaded PDF document has ${pageCount} pages.`
          });
        }
      } catch (pdfErr) {
        console.error("[OCRController] PDF validation error:", pdfErr?.message || pdfErr);
        return res.status(400).json({ error: "Uploaded file is a corrupted or password-protected PDF." });
      }
    }

    // 3. AI Extraction via Gemini Multimodal Vision API (Sequential Step 1)
    let extracted;
    try {
      extracted = await parseInvoiceOCR(buffer, mimetype);
    } catch (aiErr) {
      console.error(
        "[OCRController] Gemini OCR extraction failed:",
        aiErr?.code || "UNKNOWN",
        aiErr?.message || aiErr
      );
      const statusCode = aiErr?.statusCode || 500;
      const errorMessage =
        aiErr?.userMessage ||
        "Failed to extract invoice data using Gemini AI. Please ensure the document is clear and legible.";
      return res.status(statusCode).json({ error: errorMessage });
    }

    // 4. Sequential S3 Upload (Sequential Step 2 - Partial failure fallback)
    let scannedFileUrl = null;
    let s3Warning = null;
    try {
      scannedFileUrl = await uploadInvoiceToS3(buffer, originalname, mimetype, req.user.companyId);
      if (!scannedFileUrl) {
        s3Warning = "Data extracted successfully, but original file backup to cloud storage could not be completed.";
      }
    } catch (s3Err) {
      console.error("[OCRController] S3 upload failed silently:", s3Err?.message || s3Err);
      s3Warning = "Data extracted successfully, but original file backup to cloud storage encountered an error.";
    }
    // 4b. Invoice Number Pattern Sanitization
    let finalInvoiceNo = extracted.invoiceNo ? String(extracted.invoiceNo).trim() : null;
    const invalidWords = ["invoice", "oice", "number", "date", "details", "total", "subtotal", "vendor", "bill", "tax"];
    if (finalInvoiceNo && invalidWords.includes(finalInvoiceNo.toLowerCase())) {
      finalInvoiceNo = null;
    }
    if (!finalInvoiceNo && mimetype === 'application/pdf') {
      const bufferText = buffer.toString('utf-8') + '\n' + buffer.toString('latin1');
      const invPattern = bufferText.match(/(?:INV-[A-Za-z0-9-]+|[A-Z]{2,6}-[0-9]{3,8}|\bInvoice\s*(?:Number|No|#)?\s*[:#-]?\s*([A-Za-z0-9-]+))/i);
      if (invPattern) {
        const candidate = invPattern[1] || invPattern[0];
        if (candidate && !invalidWords.includes(candidate.toLowerCase())) {
          finalInvoiceNo = candidate;
        }
      }
    }

    // 5. Tenant-Scoped Data Matching (Exact-First + Adaptive Fuse.js)
    const companyId = req.user.companyId;

    // Fetch tenant Vendors
    const dbVendors = await prisma.vendor.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, gstin: true }
    });

    let matchedVendor = null;
    const extractedVendorName = extracted.vendorName?.trim();
    const extractedGstin = extracted.vendorGstin?.trim()?.toUpperCase();

    // Vendor Matching Strategy:
    // A. Exact GSTIN Match
    if (extractedGstin) {
      matchedVendor = dbVendors.find(v => v.gstin && v.gstin.trim().toUpperCase() === extractedGstin);
    }
    // B. Exact Name Match
    if (!matchedVendor && extractedVendorName) {
      matchedVendor = dbVendors.find(v => v.name.trim().toLowerCase() === extractedVendorName.toLowerCase());
    }
    // C. Adaptive Fuzzy Match (Fuse.js)
    if (!matchedVendor && (extractedVendorName || extractedGstin) && dbVendors.length > 0) {
      const searchTerm = extractedVendorName || extractedGstin;
      const fuse = new Fuse(dbVendors, {
        keys: ['gstin', 'name'],
        threshold: 0.25,
        includeScore: true,
        ignoreLocation: true
      });
      const searchRes = fuse.search(searchTerm);
      if (searchRes.length > 0 && searchRes[0].score < 0.25) {
        matchedVendor = searchRes[0].item;
      }
    }

    // Fetch tenant Items
    const dbItems = await prisma.item.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        purchasePrice: true,
        gstPercentage: true,
        branchStocks: {
          select: { branchId: true, stock: true }
        }
      }
    });

    // Item Matching Strategy for each line item:
    const rawItems = Array.isArray(extracted.items) ? extracted.items : [];
    const processedItems = rawItems.map((extractedItem, idx) => {
      const desc = (extractedItem.description || `Item ${idx + 1}`).trim();
      let matchedItem = null;

      // Exact SKU or Name match
      matchedItem = dbItems.find(i => (i.sku && i.sku.trim().toLowerCase() === desc.toLowerCase()) || i.name.trim().toLowerCase() === desc.toLowerCase());

      // Adaptive Fuse.js search (Require high confidence score < 0.25 to prevent false matches)
      if (!matchedItem && dbItems.length > 0) {
        const fuse = new Fuse(dbItems, {
          keys: ['sku', 'name'],
          threshold: 0.25,
          includeScore: true,
          ignoreLocation: true
        });
        const res = fuse.search(desc);
        if (res.length > 0 && res[0].score < 0.25) {
          matchedItem = res[0].item;
        }
      }

      const qty = Math.max(1, parseInt(extractedItem.qty) || 1);
      const parsedRate = parseFloat(extractedItem.unitPrice);
      const rate = !Number.isNaN(parsedRate) ? parsedRate : (matchedItem?.purchasePrice || 0);
      const parsedGst = parseFloat(extractedItem.gstPercentage);
      const gstPercentage = !Number.isNaN(parsedGst) ? parsedGst : (matchedItem?.gstPercentage || 0);
      const parsedLineTotal = parseFloat(extractedItem.lineTotal);
      const amount = !Number.isNaN(parsedLineTotal) ? parsedLineTotal : Math.round((qty * rate * (1 + gstPercentage / 100)) * 100) / 100;

      return {
        id: Date.now() + idx,
        itemId: matchedItem ? matchedItem.id : "",
        itemName: matchedItem ? matchedItem.name : desc,
        rawDescription: desc,
        qty,
        rate,
        gstPercentage,
        amount,
        currentStock: matchedItem ? (req.user.branchId ? (matchedItem.branchStocks.find(b => b.branchId === req.user.branchId)?.stock ?? 0) : 0) : 0
      };
    });

    // If no items extracted, return at least 1 empty row template
    if (processedItems.length === 0) {
      processedItems.push({
        id: Date.now(),
        itemId: "",
        itemName: "",
        rawDescription: "",
        qty: 1,
        rate: 0,
        gstPercentage: 0,
        amount: 0,
        currentStock: 0
      });
    }

    return res.status(200).json({
      success: true,
      scannedFileUrl,
      ocrConfidenceScore: extracted.confidenceScore || 85,
      s3Warning,
      data: {
        vendor: {
          matchedId: matchedVendor ? matchedVendor.id : null,
          matchedName: matchedVendor ? matchedVendor.name : null,
          extractedName: extractedVendorName || null,
          extractedGstin: extractedGstin || null
        },
        invoiceNo: finalInvoiceNo || null,
        invoiceDate: extracted.invoiceDate || null,
        taxableAmount: extracted.taxableAmount || 0,
        gstAmount: extracted.gstAmount || 0,
        grandTotal: extracted.grandTotal || 0,
        items: processedItems
      }
    });

  } catch (error) {
    console.error("[OCRController] Processing error:", error?.message || error);
    return res.status(500).json({ error: "Failed to process uploaded invoice document." });
  }
};
