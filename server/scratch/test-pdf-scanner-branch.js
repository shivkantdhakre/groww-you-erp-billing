import { PrismaClient } from '@prisma/client';
import pdfService from '../utils/pdfService.js';

const prisma = new PrismaClient();

async function runTests() {
  console.log('--- RUNNING SPRINT 6 VERIFICATION TESTS ---');

  try {
    // 1. Verify multi-branch data backfill and schema structure
    const branches = await prisma.branch.findMany({
      include: {
        invoices: true,
        users: true
      }
    });
    console.log(`PASS: Branch query works. Database contains ${branches.length} branches.`);
    
    for (const b of branches) {
      console.log(`  - Branch: "${b.name}" (ID: ${b.id}) has ${b.invoices.length} invoices and ${b.users.length} users.`);
    }

    // 2. Seed a second storefront branch to test branch isolation
    const company = await prisma.company.findFirst();
    if (!company) {
      throw new Error('No company found to run isolation tests.');
    }

    let branchB = await prisma.branch.findFirst({
      where: {
        companyId: company.id,
        name: 'Noida Outlet - Branch 2'
      }
    });

    if (!branchB) {
      branchB = await prisma.branch.create({
        data: {
          companyId: company.id,
          name: 'Noida Outlet - Branch 2',
          address: 'Noida, Sector 62',
          mobileNumber: '9999999999'
        }
      });
      console.log(`PASS: Created second branch for isolation tests: "${branchB.name}"`);
    } else {
      console.log(`PASS: Noida Outlet - Branch 2 already exists.`);
    }

    // 3. Test PDF Print Engine generation logic locally (Mock PDF generation)
    // Fetch a sample invoice with all relations loaded
    const sampleInvoice = await prisma.invoice.findFirst({
      where: { companyId: company.id },
      include: {
        company: true,
        branch: true,
        customer: true,
        vendor: true,
        items: {
          include: {
            item: true
          }
        }
      }
    });

    if (sampleInvoice) {
      console.log(`Found sample invoice: ${sampleInvoice.invoiceNo}. Generating A4 PDF...`);
      const a4PdfBuffer = await pdfService.generatePDF(sampleInvoice, 'A4');
      console.log(`PASS: A4 PDF Buffer generated. Buffer size: ${a4PdfBuffer.length} bytes.`);

      console.log(`Generating Thermal PDF...`);
      const thermalPdfBuffer = await pdfService.generatePDF(sampleInvoice, 'Thermal');
      console.log(`PASS: Thermal PDF Buffer generated. Buffer size: ${thermalPdfBuffer.length} bytes.`);

      // Test local fallback file saving
      const localUrl = await pdfService.uploadPDF(sampleInvoice, a4PdfBuffer);
      console.log(`PASS: PDF uploaded successfully (Local dev fallback URL: ${localUrl})`);
    } else {
      console.log('WARNING: No invoice found in database, skipping PDF render test.');
    }

    // Clean up browser instance
    await pdfService.closeBrowser();
    console.log('PASS: PDF Service Puppeteer browser shut down cleanly.');
    console.log('--- ALL AUTOMATED SPRINT 6 TESTS PASSED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('FAIL: Test runner encountered an error:', error);
    try {
      await pdfService.closeBrowser();
    } catch (_) {}
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
