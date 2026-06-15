import { prisma } from "../utils/prisma.js";
import { getSequenceNextValue, SEQUENCE_TYPES } from "../utils/sequence.js";
import { contextStorage } from "../utils/context.js";

async function runTest() {
  console.log("=== Testing Self-Healing Sequence Generator ===");

  let company = null;
  let branch = null;
  let customer = null;

  try {
    // 1. Create a test company & branch
    company = await prisma.company.create({
      data: {
        name: "Self Healing Co",
        address: "456 Test St",
        mobileNumber: "9876543210",
        gstNumber: "29AAAAA1111A1Z1"
      }
    });

    branch = await prisma.branch.create({
      data: {
        name: "Main Branch",
        companyId: company.id,
        address: "456 Test St",
        mobileNumber: "9876543210"
      }
    });

    // Create a test customer
    customer = await prisma.customer.create({
      data: {
        name: "Test Customer",
        mobile: "9876543210",
        companyId: company.id
      }
    });

    console.log(`Test environment setup. Company: ${company.id}, Branch: ${branch.id}`);

    // Wrap query execution inside contextStorage run to provide company & branch context
    await contextStorage.run({ user: { companyId: company.id, branchId: branch.id, role: "COMPANY_ADMIN" } }, async () => {
      // 2. Manually insert an invoice with invoiceNo = "GY-0025" (bypassing sequence table)
      console.log("Manually inserting a pre-existing invoice GY-0025...");
      await prisma.invoice.create({
        data: {
          companyId: company.id,
          branchId: branch.id,
          invoiceNo: "GY-0025",
          invoiceType: "SALE",
          customerId: customer.id,
          totalItems: 0,
          totalQty: 0,
          grandTotal: 100.0
        }
      });

      // 3. Call getSequenceNextValue to get the next sequence number (should be 26)
      console.log("Calling getSequenceNextValue on a fresh Sequence table...");
      const nextVal = await prisma.$transaction(async (tx) => {
        return getSequenceNextValue(
          company.id,
          branch.id,
          SEQUENCE_TYPES.SALE_INVOICE,
          tx
        );
      });

      console.log("Generated sequence value:", nextVal);

      if (nextVal === 26) {
        console.log("✅ SUCCESS: The sequence generator self-healed and automatically jumped to 26!");
      } else {
        console.error(`❌ FAILED: Expected next value to be 26, but got ${nextVal}`);
      }
    });

  } catch (err) {
    console.error("❌ Test encountered an error:", err);
  } finally {
    // 4. Cleanup
    console.log("Cleaning up test data...");
    try {
      if (customer) {
        await prisma.invoice.deleteMany({
          where: { companyId: company.id }
        });
        await prisma.customer.delete({
          where: { id: customer.id }
        });
      }
      if (branch) {
        await prisma.sequence.deleteMany({
          where: { companyId: company.id }
        });
        await prisma.branch.delete({
          where: { id: branch.id }
        });
      }
      if (company) {
        await prisma.company.delete({
          where: { id: company.id }
        });
      }
      console.log("Cleanup complete.");
    } catch (cleanupErr) {
      console.error("Error during cleanup:", cleanupErr);
    }
    process.exit(0);
  }
}

runTest();
