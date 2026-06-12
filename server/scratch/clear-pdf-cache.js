import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.invoice.updateMany({
    data: {
      pdfUrl: null
    }
  });
  console.log(`Successfully cleared cached PDF URLs for ${result.count} invoices.`);
}

main()
  .catch(err => {
    console.error("Failed to clear PDF cache:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
