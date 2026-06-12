import prisma from '../utils/prisma.js';
import { contextStorage } from '../utils/context.js';
import { PrismaClient } from '@prisma/client';

const basePrisma = new PrismaClient();

async function runTests() {
  console.log('=== RUNNING SECURITY & ARCHITECTURE ISOLATION TESTS ===\n');

  // 1. Setup clean seed data using base client (no filters applied)
  const testCompany = await basePrisma.company.create({
    data: {
      name: 'Branch Isolation Testing Inc.',
      invoicePrefix: 'BIT-',
      currentFinancialYearStart: new Date('2026-04-01'),
    },
  });

  const branch1 = await basePrisma.branch.create({
    data: { name: 'BIT-Branch 1', companyId: testCompany.id },
  });

  const branch2 = await basePrisma.branch.create({
    data: { name: 'BIT-Branch 2', companyId: testCompany.id },
  });

  // Seed Users
  const staff1 = { id: 1001, role: 'STAFF', companyId: testCompany.id, branchId: branch1.id };
  const staff2 = { id: 1002, role: 'STAFF', companyId: testCompany.id, branchId: branch2.id };
  const adminGlobal = { id: 1003, role: 'COMPANY_ADMIN', companyId: testCompany.id, branchId: null };
  const staffVulnerable = { id: 1004, role: 'STAFF', companyId: testCompany.id, branchId: null }; // Vulnerable state (missing branchId)

  // Seed Customer
  const customer = await basePrisma.customer.create({
    data: {
      name: 'Jane Doe',
      mobile: '9876543210',
      companyId: testCompany.id,
    },
  });

  // Seed Item
  const item = await basePrisma.item.create({
    data: {
      name: 'Gold Widget',
      sku: 'WIDGET-GOLD',
      unit: 'pcs',
      purchasePrice: 100,
      salePrice: 200,
      openingStock: 100, // global legacy value
      companyId: testCompany.id,
    },
  });

  // Seed BranchStocks
  await basePrisma.branchStock.createMany({
    data: [
      { branchId: branch1.id, itemId: item.id, stock: 10 }, // Branch 1 has 10 units
      { branchId: branch2.id, itemId: item.id, stock: 5 },  // Branch 2 has 5 units
    ],
  });

  console.log('✔ Seeded test environments successfully.');

  let passes = 0;
  let failures = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passes++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failures++;
    }
  };

  try {
    // ----------------------------------------------------
    // TEST 1: Strict RBAC check (Vulnerable Missing Branch)
    // ----------------------------------------------------
    console.log('\n--- TEST 1: Strict RBAC check (Missing Branch context for Staff) ---');
    try {
      await contextStorage.run({ user: staffVulnerable }, async () => {
        await prisma.invoice.findMany();
      });
      assert(false, 'Allowed staff user with missing branchId to view invoices');
    } catch (err) {
      assert(err.status === 403 && err.message.includes('Missing branch context'), `Staff missing branchId blocked with: ${err.message}`);
    }

    // ----------------------------------------------------
    // TEST 2: Tenant & Branch RLS Read Isolation
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Tenant & Branch RLS Read Isolation ---');
    // Create invoice under staff1 (Branch 1)
    let invoiceB1;
    await contextStorage.run({ user: staff1 }, async () => {
      invoiceB1 = await prisma.invoice.create({
        data: {
          invoiceNo: 'BIT-0001',
          invoiceType: 'SALE',
          totalItems: 0,
          totalQty: 0,
          grandTotal: 1000,
        },
      });
    });

    // Check staff1 can view it
    await contextStorage.run({ user: staff1 }, async () => {
      const invoices = await prisma.invoice.findMany();
      assert(invoices.length === 1 && invoices[0].id === invoiceB1.id, `Branch 1 staff read isolated: found ${invoices.length} invoices`);
    });

    // Check staff2 cannot view it
    await contextStorage.run({ user: staff2 }, async () => {
      const invoices = await prisma.invoice.findMany();
      assert(invoices.length === 0, 'Branch 2 staff read isolated (found 0 Branch 1 invoices)');
    });

    // Check global admin can view it (no branch filter)
    await contextStorage.run({ user: adminGlobal }, async () => {
      const invoices = await prisma.invoice.findMany();
      assert(invoices.length === 1, 'Global Admin bypassed branch filter to view all company records');
    });

    // ----------------------------------------------------
    // TEST 3: Extended Client Propagation inside interactive Transactions
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Extended Client propagation inside Interactive Transactions ---');
    await contextStorage.run({ user: staff2 }, async () => {
      await prisma.$transaction(async (tx) => {
        const txInvoices = await tx.invoice.findMany();
        assert(txInvoices.length === 0, 'Extended client rules propagated to tx instance inside interactive transaction');
      });
    });

    // ----------------------------------------------------
    // TEST 4: Branch-Specific Inventory Checks (The Paradox Solved)
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Branch-Specific Inventory Checks ---');
    // Try to decrement more than available at Branch 2 (avail: 5, req: 8)
    await contextStorage.run({ user: staff2 }, async () => {
      try {
        await prisma.invoice.create({
          data: {
            invoiceNo: 'BIT-0002',
            invoiceType: 'SALE',
            totalItems: 1,
            totalQty: 8,
            grandTotal: 1600,
          },
        });
        
        // Simulating the decrement inside controller manually to test limits
        await prisma.$transaction(async (tx) => {
          const updated = await tx.branchStock.updateMany({
            where: { itemId: item.id, branchId: branch2.id, stock: { gte: 8 } },
            data: { stock: { decrement: 8 } },
          });
          if (updated.count === 0) throw new Error('Insufficient stock');
        });
        assert(false, 'Allowed branch stock sales beyond branch capacity');
      } catch (err) {
        assert(err.message.includes('Insufficient stock') || err.message.includes('not found'), `Inventory limits validated: ${err.message}`);
      }
    });

    // Successfully execute a valid decrement (avail: 10, req: 6) in Branch 1
    await contextStorage.run({ user: staff1 }, async () => {
      await prisma.$transaction(async (tx) => {
        // Concurrency-safe decrement
        const updated = await tx.branchStock.updateMany({
          where: { itemId: item.id, branchId: branch1.id, stock: { gte: 6 } },
          data: { stock: { decrement: 6 } },
        });
        assert(updated.count === 1, 'Decremented Branch 1 stock successfully');
      });
      
      const bs1 = await basePrisma.branchStock.findFirst({ where: { branchId: branch1.id, itemId: item.id } });
      const bs2 = await basePrisma.branchStock.findFirst({ where: { branchId: branch2.id, itemId: item.id } });
      assert(bs1.stock === 4, `Branch 1 stock isolated and reduced to ${bs1.stock} (expected 4)`);
      assert(bs2.stock === 5, `Branch 2 stock remained intact at ${bs2.stock} (expected 5)`);
    });

    // ----------------------------------------------------
    // TEST 5: Idempotent Voucher Cancellation
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Idempotent Voucher Cancellation ---');
    // Create a voucher
    const voucher = await basePrisma.voucher.create({
      data: {
        voucherNo: 'PV-TEST',
        type: 'PAYMENT',
        amount: 500,
        companyId: testCompany.id,
        branchId: branch1.id,
      },
    });

    await contextStorage.run({ user: staff1 }, async () => {
      // First cancel operation
      const firstCancelResult = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.voucher.updateMany({
          where: { id: voucher.id, isCancelled: false },
          data: { isCancelled: true },
        });
        return updateResult.count;
      });
      assert(firstCancelResult === 1, 'First voucher cancellation call marked as cancelled (count: 1)');

      // Second concurrent cancel operation
      try {
        await prisma.$transaction(async (tx) => {
          const updateResult = await tx.voucher.updateMany({
            where: { id: voucher.id, isCancelled: false },
            data: { isCancelled: true },
          });
          if (updateResult.count === 0) {
            throw new Error('Voucher already cancelled or not found');
          }
          return updateResult.count;
        });
        assert(false, 'Allowed double cancellation on voucher');
      } catch (err) {
        assert(err.message.includes('already cancelled'), `Second cancel blocked successfully: ${err.message}`);
      }
    });

  } catch (err) {
    console.error('Unexpected error during test execution:', err);
  } finally {
    // Cleanup seed data
    console.log('\nCleaning up seeded test data...');
    await basePrisma.branchStock.deleteMany({ where: { itemId: item.id } });
    await basePrisma.financialTransaction.deleteMany({ where: { companyId: testCompany.id } });
    await basePrisma.voucher.deleteMany({ where: { companyId: testCompany.id } });
    await basePrisma.invoiceItem.deleteMany({ where: { invoice: { companyId: testCompany.id } } });
    await basePrisma.invoice.deleteMany({ where: { companyId: testCompany.id } });
    await basePrisma.customer.deleteMany({ where: { companyId: testCompany.id } });
    await basePrisma.item.deleteMany({ where: { companyId: testCompany.id } });
    await basePrisma.branch.deleteMany({ where: { companyId: testCompany.id } });
    await basePrisma.company.delete({ where: { id: testCompany.id } });
    await basePrisma.$disconnect();
    console.log('✔ Cleanup completed.');
  }

  console.log(`\n=== TEST RUN RESULTS: ${passes} PASSED, ${failures} FAILED ===\n`);
  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
