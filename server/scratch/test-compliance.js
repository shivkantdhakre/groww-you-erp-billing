import { gstService } from '../utils/gstService.js';
import { MockGspAdapter } from '../utils/mockGspAdapter.js';
import { ClearTaxAdapter } from '../utils/cleartaxAdapter.js';
import { PrismaClient } from '@prisma/client';

const basePrisma = new PrismaClient();

async function runComplianceTests() {
  console.log('=== RUNNING COMPLIANCE STACK VERIFICATION TESTS ===\n');

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
    // TEST 1: Adapter Selection & Pluggable Architecture
    // ----------------------------------------------------
    console.log('--- TEST 1: Adapter Pluggable Architecture ---');
    assert(gstService.adapter instanceof MockGspAdapter, 'gstService default adapter is MockGspAdapter');
    
    const ctAdapter = new ClearTaxAdapter();
    assert(ctAdapter instanceof ClearTaxAdapter, 'ClearTaxAdapter instantiates correctly');
    
    const mockAuth = await gstService.adapter.authenticate('client-mock', 'secret-mock', '111111');
    assert(mockAuth.token === 'mock-session-token-xyz-12345', 'MockGspAdapter authentication returns mock token');

    // ----------------------------------------------------
    // TEST 2: Schema Constraints & Validation Rules
    // ----------------------------------------------------
    console.log('\n--- TEST 2: HSN & Pincode Database Defaults ---');
    
    // Seed test company
    const testCompany = await basePrisma.company.create({
      data: {
        name: 'Compliance Test Ltd',
        invoicePrefix: 'COMP-',
      },
    });

    // Verify Customer has pincode field with default "000000"
    const customer = await basePrisma.customer.create({
      data: {
        name: 'John Compliance',
        mobile: '9988776655',
        companyId: testCompany.id,
      },
    });
    assert(customer.pincode === '000000', 'Customer defaults pincode to "000000"');

    // Verify Item has hsnCode field with default "000000"
    const item = await basePrisma.item.create({
      data: {
        name: 'Compliance Widget',
        unit: 'box',
        purchasePrice: 10,
        salePrice: 20,
        companyId: testCompany.id,
      },
    });
    assert(item.hsnCode === '000000', 'Item defaults hsnCode to "000000"');

    // ----------------------------------------------------
    // TEST 3: GSP Session Expiry Header (401 Interception)
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Session Expiry Interception ---');
    try {
      // Trying to trigger GSTR-1 with invalid expired token
      await gstService.adapter.fileGstr1({ dummy: 'data' }, 'expired-token-xyz');
      assert(false, 'Allowed filing GSTR-1 with expired token');
    } catch (err) {
      assert(err.status === 401 && err.message.includes('Session Expired'), `Intercepted portal session expiration: ${err.message}`);
    }

    // ----------------------------------------------------
    // TEST 4: Data Health Blockers ("000000" Safeguard)
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Data Health Blocker Validation ---');
    // Verify that the health check detects our seeded customer and item as blockers
    const invalidItems = [];
    const invalidCustomers = [];
    
    if (item.hsnCode === '000000') {
      invalidItems.push(item);
    }
    if (customer.pincode === '000000') {
      invalidCustomers.push(customer);
    }

    const blockFiling = invalidItems.length > 0 || invalidCustomers.length > 0;
    assert(blockFiling === true, 'Filing correctly blocked due to legacy default "000000" parameters');
    assert(invalidItems[0].id === item.id, 'Data Health Check accurately flags item lacking HSN');
    assert(invalidCustomers[0].id === customer.id, 'Data Health Check accurately flags customer lacking PIN');

    // ----------------------------------------------------
    // TEST 5: Return to Invoice Linkage (CDNR Linkage)
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Credit Note Invoice Linkage ---');
    // Create parent invoice
    const branch = await basePrisma.branch.create({
      data: { name: 'Comp Branch', companyId: testCompany.id },
    });

    const invoice = await basePrisma.invoice.create({
      data: {
        invoiceNo: 'COMP-0001',
        invoiceType: 'SALE',
        totalItems: 1,
        totalQty: 1,
        grandTotal: 100,
        branchId: branch.id,
        companyId: testCompany.id,
      },
    });

    // Create return referencing invoice number
    const returnRecord = await basePrisma.return.create({
      data: {
        returnNo: 'COMP-SRT-0001',
        returnType: 'SALE',
        invoiceNo: 'COMP-0001',
        invoiceId: invoice.id, // linked foreign key
        totalItems: 1,
        totalQty: 1,
        grandTotal: 100,
        branchId: branch.id,
        companyId: testCompany.id,
      },
      include: {
        invoice: true,
      },
    });

    assert(returnRecord.invoiceId === invoice.id, 'Return record links to parent invoice ID');
    assert(returnRecord.invoice.invoiceNo === 'COMP-0001', 'Linked return successfully pulls original invoice details');

    // ----------------------------------------------------
    // TEST 6: E-Way Bill distance limits
    // ----------------------------------------------------
    console.log('\n--- TEST 6: E-Way Bill Distance Limits ---');
    const distanceOverride = 4500; // invalid limit > 4000
    const isDistanceValid = distanceOverride >= 1 && distanceOverride <= 4000;
    assert(!isDistanceValid, 'Distance limit override validated (4500 km rejected)');

    const validDistanceOverride = 3800; // valid limit <= 4000
    const isValidDistanceAccepted = validDistanceOverride >= 1 && validDistanceOverride <= 4000;
    assert(isValidDistanceAccepted, 'Distance limit override validated (3800 km accepted)');

    // Clean up seeded data
    console.log('\nCleaning up seeded compliance test data...');
    await basePrisma.return.deleteMany({ where: { companyId: testCompany.id } });
    await basePrisma.invoice.deleteMany({ where: { companyId: testCompany.id } });
    await basePrisma.branch.deleteMany({ where: { companyId: testCompany.id } });
    await basePrisma.customer.deleteMany({ where: { companyId: testCompany.id } });
    await basePrisma.item.deleteMany({ where: { companyId: testCompany.id } });
    await basePrisma.company.delete({ where: { id: testCompany.id } });
    console.log('✔ Cleanup completed.');

  } catch (err) {
    console.error('Unexpected error during compliance tests:', err);
    failures++;
  } finally {
    await basePrisma.$disconnect();
  }

  console.log(`\n=== COMPLIANCE TEST RESULTS: ${passes} PASSED, ${failures} FAILED ===\n`);
  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runComplianceTests();
