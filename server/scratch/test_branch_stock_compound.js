import prisma from "../utils/prisma.js";
import { contextStorage } from "../utils/context.js";

async function testBranchStock() {
  const mockUser = {
    id: 9999,
    companyId: 1,
    role: "STAFF",
    branchId: 1
  };

  await contextStorage.run({ user: mockUser }, async () => {
    try {
      console.log("=== Running inside transaction context ===");
      await prisma.$transaction(async (tx) => {
        // Find or create a branch stock record first using upsert to make sure it exists
        console.log("1. Upserting branch stock...");
        const bs = await tx.branchStock.upsert({
          where: {
            branchId_itemId: {
              branchId: 1,
              itemId: 1
            }
          },
          create: {
            branchId: 1,
            itemId: 1,
            stock: 10
          },
          update: {}
        });
        console.log("Upserted branch stock:", bs);

        console.log("2. Querying branch stock via findUnique with compound key...");
        const latestBs = await tx.branchStock.findUnique({
          where: {
            branchId_itemId: {
              branchId: 1,
              itemId: 1
            }
          }
        });
        console.log("Found branch stock:", latestBs);
      });
      console.log("=== Transaction completed successfully! ===");
    } catch (err) {
      console.error("Test failed with error:", err);
    }
  });
}

testBranchStock().then(() => prisma.$disconnect());
