import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting DB multi-branch backfill...');

  // 1. Fetch all companies
  const companies = await prisma.company.findMany();
  console.log(`Found ${companies.length} companies to process.`);

  for (const company of companies) {
    console.log(`Processing company: ${company.name} (ID: ${company.id})...`);

    // 2. Find or create the default branch
    let defaultBranch = await prisma.branch.findFirst({
      where: {
        companyId: company.id,
        name: 'HQ - Main Branch'
      }
    });

    if (!defaultBranch) {
      defaultBranch = await prisma.branch.create({
        data: {
          companyId: company.id,
          name: 'HQ - Main Branch',
          address: company.address || 'Headquarters Address',
          mobileNumber: company.mobileNumber || ''
        }
      });
      console.log(`Created branch "HQ - Main Branch" (ID: ${defaultBranch.id}) for company ID ${company.id}`);
    } else {
      console.log(`Found existing branch "HQ - Main Branch" (ID: ${defaultBranch.id})`);
    }

    const branchId = defaultBranch.id;

    // 3. Update Users
    const usersUpdated = await prisma.user.updateMany({
      where: {
        companyId: company.id,
        branchId: null
      },
      data: {
        branchId
      }
    });
    console.log(`Updated ${usersUpdated.count} users with branchId.`);

    // 4. Update Invoices
    const invoicesUpdated = await prisma.invoice.updateMany({
      where: {
        companyId: company.id,
        branchId: null
      },
      data: {
        branchId
      }
    });
    console.log(`Updated ${invoicesUpdated.count} invoices with branchId.`);

    // 5. Update StockMovements
    const stockMovementsUpdated = await prisma.stockMovement.updateMany({
      where: {
        companyId: company.id,
        branchId: null
      },
      data: {
        branchId
      }
    });
    console.log(`Updated ${stockMovementsUpdated.count} stock movements with branchId.`);

    // 6. Update FinancialTransactions
    const financialTxUpdated = await prisma.financialTransaction.updateMany({
      where: {
        companyId: company.id,
        branchId: null
      },
      data: {
        branchId
      }
    });
    console.log(`Updated ${financialTxUpdated.count} financial transactions with branchId.`);

    // 7. Update Vouchers
    const vouchersUpdated = await prisma.voucher.updateMany({
      where: {
        companyId: company.id,
        branchId: null
      },
      data: {
        branchId
      }
    });
    console.log(`Updated ${vouchersUpdated.count} vouchers with branchId.`);

    // 8. Update Returns
    const returnsUpdated = await prisma.return.updateMany({
      where: {
        companyId: company.id,
        branchId: null
      },
      data: {
        branchId
      }
    });
    console.log(`Updated ${returnsUpdated.count} returns with branchId.`);
  }

  console.log('Backfill process complete!');
}

main()
  .catch((e) => {
    console.error('Error running backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
