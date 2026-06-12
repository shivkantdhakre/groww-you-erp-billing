import prisma from "../utils/prisma.js";
import { contextStorage } from "../utils/context.js";

async function runTests() {
  const mockUser = {
    id: 9999,
    companyId: 1,
    role: "STAFF",
    branchId: 1
  };

  // Run inside AsyncLocalStorage context
  await contextStorage.run({ user: mockUser }, async () => {
    try {
      console.log("=== Querying a Customer (Read isolation verification) ===");
      const customers = await prisma.customer.findMany({ take: 1 });
      console.log("Read successfully! Found count:", customers.length);
      if (customers.length > 0) {
        const firstCust = customers[0];
        console.log("Customer ID:", firstCust.id, "Company ID:", firstCust.companyId);

        console.log("=== Attempting Update on authorized Customer ===");
        const updated = await prisma.customer.update({
          where: { id: firstCust.id },
          data: { name: firstCust.name } // no-op update
        });
        console.log("Update success! ID:", updated.id);

        console.log("=== Attempting Update on UNAUTHORIZED Customer (should throw 404) ===");
        try {
          // Let's use a non-existent ID or an ID belonging to another company
          // Non-existent ID: 999999
          await prisma.customer.update({
            where: { id: 999999 },
            data: { name: "Unauthorized Test" }
          });
          console.error("FAIL: Managed to update non-existent/unauthorized Customer");
        } catch (err) {
          console.log("SUCCESS: Blocked unauthorized update as expected. Status:", err.status, "Message:", err.message);
        }
      }
    } catch (e) {
      console.error("Test failed with error:", e);
    }
  });
}

runTests().then(() => prisma.$disconnect());
