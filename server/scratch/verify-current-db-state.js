import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function run() {
  console.log('=== VERIFYING CURRENT DB STATE AND TESTING SIMULATION ===');
  
  // 1. Find the admin user and their company
  const user = await prisma.user.findUnique({
    where: { email: 'admin@growwyou.com' },
    include: { company: true }
  });
  
  if (!user) {
    console.error('User admin@growwyou.com not found. Please seed the database first.');
    return;
  }
  
  const companyId = user.companyId;
  console.log(`Found User: ${user.name} (${user.email})`);
  console.log(`Company ID: ${companyId}, Name: ${user.company.name}`);

  // 2. Fetch current subscription
  let sub = await prisma.subscription.findUnique({
    where: { companyId },
    include: { plan: true }
  });
  
  console.log('Current Subscription in DB:', sub ? {
    status: sub.status,
    planCode: sub.plan.code,
    planName: sub.plan.name,
    currentPeriodEnd: sub.currentPeriodEnd
  } : 'None');

  // 3. Fetch invoices
  const invoices = await prisma.subscriptionInvoice.findMany({
    where: { subscription: { companyId } },
    orderBy: { billingDate: 'desc' }
  });
  console.log(`Found ${invoices.length} invoices:`);
  invoices.forEach(inv => {
    console.log(` - Invoice No: ${inv.invoiceNo}, Amount: ₹${inv.amount}, Status: ${inv.status}, Date: ${inv.billingDate}`);
  });

  // 4. Trigger simulated webhook directly via axios to upgrade to plan_basic_monthly
  console.log('\nTriggering simulated webhook for plan_basic_monthly...');
  const mockEventId = 'evt_mock_manual_' + Math.random().toString(36).substring(2, 11);
  try {
    const response = await axios.post('http://localhost:5000/api/billing/webhooks', {
      simulated: true,
      secret: 'SIMULATED_SECRET_KEY',
      id: mockEventId,
      type: 'order.paid',
      data: {
        object: {
          id: 'cs_mock_' + Math.random().toString(36).substring(2, 11),
          customer: 'cus_mock_' + Math.random().toString(36).substring(2, 11),
          subscription: 'sub_mock_' + Math.random().toString(36).substring(2, 11),
          simulatedMetadata: {
            companyId: companyId.toString(),
            planCode: 'plan_basic_monthly',
            price: 999
          }
        }
      }
    });
    console.log('Webhook response status:', response.status);
    console.log('Webhook response data:', response.data);
  } catch (err) {
    console.error('Webhook request failed:', err.response?.data || err.message);
  }

  // 5. Verify updated subscription state
  sub = await prisma.subscription.findUnique({
    where: { companyId },
    include: { plan: true }
  });
  
  console.log('\nUpdated Subscription in DB:', sub ? {
    status: sub.status,
    planCode: sub.plan.code,
    planName: sub.plan.name,
    currentPeriodEnd: sub.currentPeriodEnd
  } : 'None');

  // 6. Fetch invoices again
  const newInvoices = await prisma.subscriptionInvoice.findMany({
    where: { subscription: { companyId } },
    orderBy: { billingDate: 'desc' }
  });
  console.log(`Updated - Found ${newInvoices.length} invoices:`);
  newInvoices.forEach(inv => {
    console.log(` - Invoice No: ${inv.invoiceNo}, Amount: ₹${inv.amount}, Status: ${inv.status}, Date: ${inv.billingDate}`);
  });
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
