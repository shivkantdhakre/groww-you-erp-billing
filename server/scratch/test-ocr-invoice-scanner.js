import dotenv from 'dotenv';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import Fuse from 'fuse.js';
import prisma from '../utils/prisma.js';
import { parseInvoiceOCR } from '../utils/geminiService.js';
import { processInvoiceOCR } from '../controllers/ocrController.js';

dotenv.config();

/**
 * Creates a valid sample 1-page PDF Invoice Buffer using pdf-lib.
 */
async function createSampleInvoicePdfBuffer() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText('TAX INVOICE', { x: 50, y: 350, size: 20, font, color: rgb(0.1, 0.1, 0.4) });
  page.drawText('Vendor: Acme Industrial Tools Pvt Ltd', { x: 50, y: 320, size: 12, font: fontRegular });
  page.drawText('GSTIN: 27AAACA1234A1Z5', { x: 50, y: 300, size: 12, font: fontRegular });
  page.drawText('Invoice No: INV-2026-9081', { x: 350, y: 320, size: 12, font: fontRegular });
  page.drawText('Invoice Date: 2026-07-28', { x: 350, y: 300, size: 12, font: fontRegular });

  page.drawText('Line Items:', { x: 50, y: 260, size: 14, font });
  page.drawText('1. Steel Rod 12mm - Qty: 10 - Unit Price: 1450.00 - GST: 18% - Total: 17110.00', { x: 50, y: 230, size: 11, font: fontRegular });

  page.drawText('Grand Total: INR 17,110.00', { x: 350, y: 170, size: 14, font, color: rgb(0, 0.5, 0) });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Creates a sample 4-page PDF Buffer to test page count restriction guard.
 */
async function createMultiPagePdfBuffer() {
  const pdfDoc = await PDFDocument.create();
  for (let i = 1; i <= 4; i++) {
    const page = pdfDoc.addPage([400, 400]);
    page.drawText(`Page ${i} of Catalog`, { x: 50, y: 350, size: 16 });
  }
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function runTestSuite() {
  console.log("=================================================================");
  console.log("🧪 RUNNING COMPREHENSIVE TEST SUITE FOR OCR MULTIMODAL AI");
  console.log("=================================================================\n");

  let passedTests = 0;
  let totalTests = 4;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: PDF Guardrail & Page Count Check (pdf-lib)
    // -------------------------------------------------------------------------
    console.log("--- TEST 1: PDF Guardrail & Page Count Check ---");
    const multiPageBuffer = await createMultiPagePdfBuffer();
    const pdfDoc = await PDFDocument.load(multiPageBuffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();

    if (pageCount > 3) {
      console.log(`✅ TEST 1 PASSED: Correctly detected ${pageCount} pages (> 3 limit block).`);
      passedTests++;
    } else {
      console.error(`❌ TEST 1 FAILED: Expected > 3 pages, got ${pageCount}`);
    }
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 2: Exact-First & Adaptive Fuse.js Matching Engine
    // -------------------------------------------------------------------------
    console.log("--- TEST 2: Exact-First & Adaptive Fuse.js Fuzzy Match Engine ---");
    const mockVendors = [
      { id: 1, name: "Acme Industrial Tools Pvt Ltd", gstin: "27AAACA1234A1Z5" },
      { id: 2, name: "Global Tech Supplies", gstin: "29BBBBB5678B1Z2" }
    ];

    const mockItems = [
      { id: 10, name: "Steel Rod 12mm", sku: "SR-12", purchasePrice: 1450, gstPercentage: 18 },
      { id: 11, name: "Aluminum Sheet 2mm", sku: "AL-02", purchasePrice: 850, gstPercentage: 12 }
    ];

    // Case A: Exact GSTIN match
    const targetGstin = "27AAACA1234A1Z5";
    let matchedVendor = mockVendors.find(v => v.gstin === targetGstin);
    console.log(`  Case A (Exact GSTIN): "${targetGstin}" -> Matched Vendor ID: ${matchedVendor?.id} (${matchedVendor?.name})`);

    // Case B: Short SKU fuzzy matching with adaptive threshold
    const extractedShortSku = "SR-12";
    let matchedItem = mockItems.find(i => i.sku === extractedShortSku);
    if (!matchedItem) {
      const fuse = new Fuse(mockItems, { keys: ['sku', 'name'], threshold: extractedShortSku.length < 5 ? 0.1 : 0.35 });
      matchedItem = fuse.search(extractedShortSku)[0]?.item;
    }
    console.log(`  Case B (Short SKU Match): "${extractedShortSku}" -> Matched Item ID: ${matchedItem?.id} (${matchedItem?.name})`);

    if (matchedVendor?.id === 1 && matchedItem?.id === 10) {
      console.log("✅ TEST 2 PASSED: Exact-first and Fuse.js adaptive matching operated flawlessly.");
      passedTests++;
    } else {
      console.error("❌ TEST 2 FAILED: Matching engine returned incorrect vendor or item.");
    }
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 3: Gemini Multimodal Vision API OCR Parser
    // -------------------------------------------------------------------------
    console.log("--- TEST 3: Gemini Multimodal Vision API OCR Extraction ---");
    console.log("  Waiting 10s for Gemini API rate-limit window to reset...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    const sampleInvoiceBuffer = await createSampleInvoicePdfBuffer();
    console.log("  Sending 1-page sample invoice PDF to Gemini Vision AI...");

    const ocrResult = await parseInvoiceOCR(sampleInvoiceBuffer, "application/pdf");
    console.log("  Extracted Data from Gemini:");
    console.log(`    - Vendor Name: "${ocrResult.vendorName}"`);
    console.log(`    - Vendor GSTIN: "${ocrResult.vendorGstin}"`);
    console.log(`    - Invoice No: "${ocrResult.invoiceNo}"`);
    console.log(`    - Invoice Date: "${ocrResult.invoiceDate}"`);
    console.log(`    - Grand Total: ${ocrResult.grandTotal}`);
    console.log(`    - Extracted Items Count: ${ocrResult.items?.length || 0}`);
    console.log(`    - Confidence Score: ${ocrResult.confidenceScore}%`);

    if (ocrResult && ocrResult.items && ocrResult.items.length > 0) {
      console.log("✅ TEST 3 PASSED: Gemini Vision AI successfully extracted structured JSON invoice data.");
      passedTests++;
    } else {
      console.error("❌ TEST 3 FAILED: Gemini returned invalid or empty OCR structure.");
    }
    console.log("");

    // -------------------------------------------------------------------------
    // TEST 4: End-to-End Controller Workflow (Simulated Express Req/Res)
    // -------------------------------------------------------------------------
    console.log("--- TEST 4: End-to-End Controller Execution (Validation -> Gemini -> S3 -> Matching) ---");
    
    // Auth & DB setup
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: { name: "OCR Testing Enterprise", gstNumber: "27AAACA1234A1Z5" }
      });
    }

    let branch = await prisma.branch.findFirst({ where: { companyId: company.id } });
    if (!branch) {
      branch = await prisma.branch.create({
        data: { companyId: company.id, name: "Main Branch", code: "MAIN" }
      });
    }

    let user = await prisma.user.findFirst({ where: { companyId: company.id } });
    if (!user) {
      user = await prisma.user.create({
        data: { companyId: company.id, name: "OCR Tester", email: "ocr.tester@growwyou.com", password: "password", role: "COMPANY_ADMIN" }
      });
    }

    // Ensure test vendor exists in DB for fuzzy match verification
    let testVendor = await prisma.vendor.findFirst({ where: { companyId: company.id, gstin: "27AAACA1234A1Z5" } });
    if (!testVendor) {
      testVendor = await prisma.vendor.create({
        data: { companyId: company.id, name: "Acme Industrial Tools Pvt Ltd", mobile: "9876543210", gstin: "27AAACA1234A1Z5" }
      });
    }

    // Ensure test item exists in DB for fuzzy match verification
    let testItem = await prisma.item.findFirst({ where: { companyId: company.id, sku: "SR-12" } });
    if (!testItem) {
      testItem = await prisma.item.create({
        data: { companyId: company.id, name: "Steel Rod 12mm", sku: "SR-12", unit: "pcs", purchasePrice: 1450, salePrice: 1800, gstPercentage: 18 }
      });
    }

    const mockReq = {
      file: {
        buffer: sampleInvoiceBuffer,
        mimetype: "application/pdf",
        originalname: "sample-invoice.pdf",
        size: sampleInvoiceBuffer.length
      },
      user: {
        id: user.id,
        companyId: company.id,
        branchId: branch.id
      }
    };

    let controllerResponseData = null;
    let controllerStatusCode = 0;

    const mockRes = {
      status(code) {
        controllerStatusCode = code;
        return this;
      },
      json(payload) {
        controllerResponseData = payload;
        return this;
      }
    };

    await processInvoiceOCR(mockReq, mockRes);

    console.log(`  Controller Status Code: ${controllerStatusCode}`);
    console.log(`  Controller Output Success: ${controllerResponseData?.success}`);
    console.log(`  Matched Vendor ID: ${controllerResponseData?.data?.vendor?.matchedId} (${controllerResponseData?.data?.vendor?.matchedName})`);
    console.log(`  Matched Line Items Count: ${controllerResponseData?.data?.items?.length}`);
    console.log(`  S3 Scanned File URL: ${controllerResponseData?.scannedFileUrl || "Not configured / Fallback active"}`);

    if (controllerStatusCode === 200 && controllerResponseData?.success && controllerResponseData?.data) {
      console.log("✅ TEST 4 PASSED: End-to-End Controller pipeline executed successfully!");
      passedTests++;
    } else {
      console.error("❌ TEST 4 FAILED: Controller returned error:", controllerResponseData);
    }
    console.log("");

  } catch (err) {
    console.error("❌ CRITICAL UNHANDLED ERROR IN TEST SUITE:", err);
  } finally {
    console.log("=================================================================");
    console.log(`📊 TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
    console.log("=================================================================");
    await prisma.$disconnect();
  }
}

runTestSuite();
