import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING BRANCH STOCK BACKFILL ---');

  // 1. Fetch all companies, branches, and items
  const companies = await prisma.company.findMany({
    include: {
      branches: true,
      items: true,
    },
  });

  let totalCreated = 0;
  let totalHQInitializations = 0;

  for (const company of companies) {
    console.log(`Processing Company: "${company.name}" (ID: ${company.id})`);
    
    const branches = company.branches;
    const items = company.items;

    if (branches.length === 0) {
      console.log(`  Warning: No branches found for company ${company.name}. Skipping stock backfill.`);
      continue;
    }

    // Find the default HQ branch (we check for "HQ - Main Branch", fallback to the first branch)
    const hqBranch = branches.find(b => b.name === 'HQ - Main Branch') || branches[0];
    console.log(`  HQ Branch resolved to: "${hqBranch.name}" (ID: ${hqBranch.id})`);

    for (const item of items) {
      for (const branch of branches) {
        const isHq = branch.id === hqBranch.id;
        const initialStock = isHq ? item.openingStock : 0;

        // Upsert BranchStock record
        await prisma.branchStock.upsert({
          where: {
            branchId_itemId: {
              branchId: branch.id,
              itemId: item.id,
            },
          },
          update: {}, // Keep existing stocks if they exist
          create: {
            branchId: branch.id,
            itemId: item.id,
            stock: initialStock,
          },
        });

        totalCreated++;
        if (isHq && initialStock > 0) {
          totalHQInitializations++;
        }
      }
    }
  }

  console.log(`--- BACKFILL COMPLETED SUCCESSFULLY ---`);
  console.log(`Total BranchStock records processed: ${totalCreated}`);
  console.log(`HQ Branch stocks initialized with historical values: ${totalHQInitializations}`);
}

main()
  .catch((e) => {
    console.error('Error during backfill-branch-stocks:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
