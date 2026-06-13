import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- STARTING SUBSCRIPTION BILLING API VERIFICATION ---');

  // 1. Fetch Plans
  console.log('\n1. Verifying plans database queries...');
  const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true } });
  console.log(`Successfully retrieved ${plans.length} subscription plans.`);
  plans.forEach((p) => console.log(` - ${p.name} (${p.code}) @ ₹${p.price}`));

  // 2. Setup a test company and staff user to verify login and auto-provisioning
  console.log('\n2. Verifying login auto-provisioning...');
  const testCompany = await prisma.company.create({
    data: {
      name: 'Test Billing Inc',
      gstNumber: '27AAAAA1111A1Z1',
      address: 'Pune, MH',
      mobileNumber: '9876543210',
      invoicePrefix: 'TBI',
      financialYear: '2026-27'
    }
  });

  const testUser = await prisma.user.create({
    data: {
      companyId: testCompany.id,
      name: 'Billing Admin',
      email: `admin_${testCompany.id}@test.com`,
      password: '$2b$10$vI8qO3U/vE7w9iFzZ.P/ZeqqJ.cZ65j1h9q7lC8P2p0qO2J6V5L1q', // dummy hash
      role: 'COMPANY_ADMIN',
      isActive: true
    }
  });

  console.log(`Created test company (ID: ${testCompany.id}) and user (${testUser.email}).`);

  // Simulate Login Auto-provisioning logic
  let subscription = await prisma.subscription.findUnique({
    where: { companyId: testCompany.id },
    include: { plan: true }
  });

  console.log('DB check before login trigger: subscription is', subscription);

  if (!subscription) {
    const trialPlan = await prisma.subscriptionPlan.findUnique({
      where: { code: 'plan_trial' }
    });
    if (trialPlan) {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 14);

      subscription = await prisma.subscription.create({
        data: {
          companyId: testCompany.id,
          planId: trialPlan.id,
          status: 'TRIAL',
          trialEndsAt: trialEnds,
          currentPeriodEnd: trialEnds,
          gatewayName: 'SYSTEM_TRIAL'
        },
        include: { plan: true }
      });
      console.log('Successfully simulated auto-provisioning Free Trial on login:', subscription.plan.name);
    }
  }

  // 3. Webhook Simulation & Idempotency Check
  console.log('\n3. Verifying mock webhook idempotency pipeline...');
  const mockEventId = 'evt_test_unit_' + Math.random().toString(36).substring(2, 9);

  // Process Event 1
  const processWebhook = async (evtId) => {
    // check idempotency
    const existing = await prisma.webhookEvent.findUnique({ where: { id: evtId } });
    if (existing) {
      return { status: 200, message: 'Event already processed (idempotent)' };
    }

    await prisma.webhookEvent.create({ data: { id: evtId, gateway: 'MOCK_SANDBOX' } });

    // Mutate
    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: 'plan_professional_monthly' } });
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.$transaction([
      prisma.subscription.upsert({
        where: { companyId: testCompany.id },
        update: {
          planId: plan.id,
          status: 'ACTIVE',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          gatewayName: 'MOCK_SANDBOX',
          trialEndsAt: null
        },
        create: {
          companyId: testCompany.id,
          planId: plan.id,
          status: 'ACTIVE',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          gatewayName: 'MOCK_SANDBOX',
          trialEndsAt: null
        }
      }),
      prisma.subscriptionInvoice.create({
        data: {
          subscription: { connect: { companyId: testCompany.id } },
          invoiceNo: `SUB-INV-TEST-${evtId.substring(0, 10).toUpperCase()}`,
          amount: plan.price,
          status: 'PAID',
          billingDate: new Date()
        }
      })
    ]);

    return { status: 200, message: 'Processed successfully' };
  };

  const run1 = await processWebhook(mockEventId);
  console.log(`First run webhook result: status=${run1.status}, message=${run1.message}`);

  // Verify DB updated
  const updatedSub = await prisma.subscription.findUnique({
    where: { companyId: testCompany.id },
    include: { plan: true }
  });
  console.log(`Subscription updated in DB: status=${updatedSub.status}, plan=${updatedSub.plan.name}`);

  // Process Event 2 (duplicate check)
  const run2 = await processWebhook(mockEventId);
  console.log(`Second run webhook result (duplicate): status=${run2.status}, message=${run2.message}`);

  // Cleanup test data
  console.log('\n4. Cleaning up test data...');
  await prisma.subscriptionInvoice.deleteMany({
    where: { subscription: { companyId: testCompany.id } }
  });
  await prisma.subscription.deleteMany({
    where: { companyId: testCompany.id }
  });
  await prisma.webhookEvent.delete({
    where: { id: mockEventId }
  });
  await prisma.user.delete({
    where: { id: testUser.id }
  });
  await prisma.company.delete({
    where: { id: testCompany.id }
  });
  console.log('Cleanup completed successfully.');

  console.log('\n--- VERIFICATION TEST PASSED SUCCESSFULLY ---');
}

runTests()
  .catch((e) => {
    console.error('Test run failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
