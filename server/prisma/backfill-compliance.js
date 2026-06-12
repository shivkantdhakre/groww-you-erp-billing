import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING RETURN-INVOICE LINKAGE BACKFILL ---');

  // Fetch all returns
  const returns = await prisma.return.findMany();
  console.log(`Found ${returns.length} total Return records to process.`);

  const orphanedReturns = [];
  let linkedCount = 0;

  for (const ret of returns) {
    if (!ret.invoiceNo) {
      console.log(`  Return ID ${ret.id}: Missing invoiceNo reference. Logging as orphan.`);
      orphanedReturns.push({
        id: ret.id,
        returnNo: ret.returnNo,
        reason: 'Missing invoiceNo reference',
        returnDate: ret.returnDate,
      });
      continue;
    }

    // Find the original invoice
    const invoice = await prisma.invoice.findFirst({
      where: {
        companyId: ret.companyId,
        invoiceNo: ret.invoiceNo,
      },
    });

    if (invoice) {
      // Link the return to the invoice
      await prisma.return.update({
        where: { id: ret.id },
        data: { invoiceId: invoice.id },
      });
      linkedCount++;
    } else {
      console.log(`  Return ID ${ret.id} (${ret.returnNo}): Invoice "${ret.invoiceNo}" not found. Logging as orphan.`);
      orphanedReturns.push({
        id: ret.id,
        returnNo: ret.returnNo,
        invoiceNo: ret.invoiceNo,
        returnDate: ret.returnDate,
        reason: 'Invoice not found in system',
      });
    }
  }

  // Write orphans to log file
  const logDir = path.join(process.cwd(), 'prisma');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logPath = path.join(logDir, 'orphaned_returns_log.json');
  fs.writeFileSync(logPath, JSON.stringify(orphanedReturns, null, 2));

  console.log(`\n--- BACKFILL COMPLETED ---`);
  console.log(`Successfully linked returns: ${linkedCount}`);
  console.log(`Orphaned returns logged: ${orphanedReturns.length}`);
  console.log(`Orphans log saved to: ${logPath}`);
}

main()
  .catch((e) => {
    console.error('Error executing backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
