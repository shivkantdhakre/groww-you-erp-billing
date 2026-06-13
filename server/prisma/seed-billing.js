import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      code: 'plan_trial',
      name: 'Free Trial',
      price: 0,
      interval: 'MONTHLY',
      branchLimit: 1,
      staffLimit: 1,
      features: {
        gstFiling: false,
        ewayBill: false,
        accountingIntegration: false,
        maxInvoicesPerMonth: 100,
      },
    },
    {
      code: 'plan_basic_monthly',
      name: 'Basic Monthly',
      price: 999,
      interval: 'MONTHLY',
      branchLimit: 2,
      staffLimit: 3,
      features: {
        gstFiling: false,
        ewayBill: false,
        accountingIntegration: true,
        maxInvoicesPerMonth: 1000,
      },
    },
    {
      code: 'plan_basic_yearly',
      name: 'Basic Yearly',
      price: 9999,
      interval: 'YEARLY',
      branchLimit: 2,
      staffLimit: 3,
      features: {
        gstFiling: false,
        ewayBill: false,
        accountingIntegration: true,
        maxInvoicesPerMonth: 12000,
      },
    },
    {
      code: 'plan_professional_monthly',
      name: 'Professional Monthly',
      price: 2499,
      interval: 'MONTHLY',
      branchLimit: 5,
      staffLimit: 9999,
      features: {
        gstFiling: true,
        ewayBill: true,
        accountingIntegration: true,
      },
    },
    {
      code: 'plan_professional_yearly',
      name: 'Professional Yearly',
      price: 24999,
      interval: 'YEARLY',
      branchLimit: 5,
      staffLimit: 9999,
      features: {
        gstFiling: true,
        ewayBill: true,
        accountingIntegration: true,
      },
    },
  ];

  console.log('Seeding subscription plans...');
  for (const plan of plans) {
    const upserted = await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        price: plan.price,
        interval: plan.interval,
        branchLimit: plan.branchLimit,
        staffLimit: plan.staffLimit,
        features: plan.features,
      },
      create: plan,
    });
    console.log(`Upserted plan: ${upserted.name} (${upserted.code})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
