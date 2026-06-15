import { prisma } from "../utils/prisma.js";
import { getSequenceNextValue, SEQUENCE_TYPES } from "../utils/sequence.js";
import { contextStorage } from "../utils/context.js";

async function runTest() {
  console.log("=== Concurrency Billing Sequence Test ===");
  
  let company = null;
  let branch = null;

  try {
    // 1. Create temporary test company & branch to avoid foreign key errors
    company = await prisma.company.create({
      data: {
        name: "Test Concurrency Co",
        address: "123 Test St",
        mobileNumber: "1234567890",
        gstNumber: "29AAAAA1111A1Z1"
      }
    });

    branch = await prisma.branch.create({
      data: {
        name: "Test Concurrency Branch",
        companyId: company.id,
        address: "123 Test St",
        mobileNumber: "1234567890"
      }
    });

    console.log(`Created test company ID: ${company.id}, branch ID: ${branch.id}`);

    // 2. Spawn 10 concurrent requests to get the next sequence number
    const concurrencyCount = 10;
    console.log(`Spawning ${concurrencyCount} concurrent transactions...`);

    const results = await contextStorage.run({ user: { companyId: company.id, branchId: branch.id, role: "COMPANY_ADMIN" } }, async () => {
      const promises = Array.from({ length: concurrencyCount }).map(async (_, index) => {
        return prisma.$transaction(async (tx) => {
          // Add a slight artificial delay to maximize overlap opportunity
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));
          
          const seqVal = await getSequenceNextValue(
            company.id,
            branch.id,
            SEQUENCE_TYPES.SALE_INVOICE,
            tx
          );
          return seqVal;
        });
      });

      return Promise.all(promises);
    });

    console.log("Raw Sequence values received:", results);

    // 3. Verify results
    const uniqueValues = new Set(results);
    const hasDuplicates = uniqueValues.size !== results.length;
    
    // Sort results to verify consecutive numbering (1 to 10)
    results.sort((a, b) => a - b);
    const isConsecutive = results.every((val, idx) => val === idx + 1);

    if (hasDuplicates) {
      console.error("❌ FAILED: Duplicate sequence numbers detected!");
    } else if (!isConsecutive) {
      console.error("❌ FAILED: Sequence numbers are not consecutive from 1 to 10:", results);
    } else {
      console.log("✅ SUCCESS: All 10 concurrent sequence values were generated atomically and sequentially (1 to 10)!");
    }

  } catch (err) {
    console.error("❌ Test encountered an error:", err);
  } finally {
    // 4. Cleanup
    console.log("Cleaning up test records...");
    try {
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
