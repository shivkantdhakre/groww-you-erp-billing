import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  try {
    const customer = await prisma.customer.findFirst();
    if (!customer) {
      console.log("No customer found to test with");
      return;
    }
    console.log("Found customer ID:", customer.id, "Company ID:", customer.companyId);

    // Try updating with correct companyId
    const updatedCorrect = await prisma.customer.update({
      where: {
        id: customer.id,
        companyId: customer.companyId
      },
      data: {
        name: customer.name // no-op update or keep name same
      }
    });
    console.log("Success with correct companyId!");

    // Try updating with incorrect companyId
    try {
      await prisma.customer.update({
        where: {
          id: customer.id,
          companyId: customer.companyId + 999
        },
        data: {
          name: customer.name
        }
      });
      console.log("Error: Managed to update with incorrect companyId!");
    } catch (e) {
      console.log("Failed as expected with incorrect companyId. Error code:", e.code);
    }

  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
