import prisma from '../utils/prisma.js';
import crypto from 'crypto';
import axios from 'axios';
import { clearSubscriptionCache } from '../middleware/checkSubscription.js';

/**
 * GET /api/billing/plans
 * Lists all active subscription plans.
 */
export const getPlans = async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });
    res.status(200).json(plans);
  } catch (error) {
    console.error('Fetch Plans Error:', error);
    res.status(500).json({ error: 'Failed to retrieve subscription plans.' });
  }
};

/**
 * POST /api/billing/checkout
 * Generates a checkout session/order. Calls Razorpay API directly using Axios Basic Auth if keys are present, else fallback mock sandbox.
 */
export const createCheckoutSession = async (req, res) => {
  const { planCode } = req.body;
  const companyId = req.user.companyId;

  if (!planCode) {
    return res.status(400).json({ error: 'planCode is required.' });
  }

  try {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code: planCode }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // 1. If Razorpay Key is configured, create a Razorpay Order directly using Axios
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret && !keyId.includes('your_')) {
      const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      
      try {
        const orderRes = await axios.post(
          'https://api.razorpay.com/v1/orders',
          {
            amount: Math.round(plan.price * 100), // in paise
            currency: 'INR',
            receipt: `receipt_sub_${companyId}_${plan.code.substring(0, 15)}`,
            notes: {
              companyId: companyId.toString(),
              planCode: plan.code
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${basicAuth}`
            }
          }
        );

        const order = orderRes.data;
        return res.status(200).json({
          gateway: 'RAZORPAY',
          keyId: keyId,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          description: `Groww You ERP - ${plan.name} Subscription`,
          planCode: plan.code
        });
      } catch (err) {
        console.error('Razorpay API Order Generation failed:', err.response?.data || err.message);
        return res.status(500).json({ error: 'Payment gateway API error. Fallback to mock session.' });
      }
    }

    // 2. Local sandbox fallback simulation URL
    const simulationUrl = `${frontendUrl}/pricing?simulate_checkout=true&companyId=${companyId}&planCode=${plan.code}&price=${plan.price}&planName=${encodeURIComponent(plan.name)}`;
    return res.status(200).json({ url: simulationUrl, gateway: 'MOCK_SANDBOX' });
  } catch (error) {
    console.error('Checkout Session Error:', error);
    res.status(500).json({ error: 'Failed to generate checkout session.' });
  }
};

/**
 * POST /api/billing/verify-payment
 * Verify Razorpay frontend signatures cryptographically.
 */
export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planCode } = req.body;
  const companyId = req.user.companyId;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !planCode) {
    return res.status(400).json({ error: 'Missing payment verification details.' });
  }

  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keySecret) {
      return res.status(400).json({ error: 'Razorpay keys not configured on server.' });
    }

    // Cryptographically calculate HMAC SHA256 signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'INVALID_SIGNATURE', message: 'Cryptographic signature mismatch.' });
    }

    // Process upgrade
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code: planCode }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found.' });
    }

    const periodStart = new Date();
    const periodEnd = new Date();
    if (plan.interval === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const eventId = `pay_${razorpay_payment_id}`;

    // Update Subscription
    await prisma.$transaction([
      prisma.subscription.upsert({
        where: { companyId },
        update: {
          planId: plan.id,
          status: 'ACTIVE',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          gatewayName: 'RAZORPAY',
          gatewaySubscriptionId: razorpay_order_id,
          trialEndsAt: null
        },
        create: {
          companyId,
          planId: plan.id,
          status: 'ACTIVE',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          gatewayName: 'RAZORPAY',
          gatewaySubscriptionId: razorpay_order_id,
          trialEndsAt: null
        }
      }),
      prisma.subscriptionInvoice.create({
        data: {
          subscription: { connect: { companyId } },
          invoiceNo: `SUB-INV-${eventId.substring(0, 10).toUpperCase()}`,
          amount: plan.price,
          status: 'PAID',
          billingDate: new Date()
        }
      })
    ]);

    // Evict local in-memory subscription cache to ensure instant update propagation
    clearSubscriptionCache(companyId);

    res.status(200).json({ success: true, message: 'Payment verified and subscription activated.' });
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ error: 'Payment verification failed.' });
  }
};

/**
 * POST /api/billing/webhooks
 * Signature-verified & idempotent Razorpay webhook receiver.
 */
export const handleWebhook = async (req, res) => {
  const sig = req.headers['x-razorpay-signature'];
  let event = null;

  try {
    // 1. Authenticate Event Origin
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && sig) {
      // Cryptographically verify official Razorpay HMAC signatures
      try {
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(req.body)
          .digest('hex');

        if (expectedSignature !== sig) {
          console.error('Razorpay Webhook Signature Verification Failed');
          return res.status(400).send('Webhook Signature Mismatch');
        }

        event = JSON.parse(req.body.toString('utf8'));
      } catch (err) {
        console.error('Razorpay Webhook Parse Failed:', err.message);
        return res.status(400).send(`Webhook signature check failed: ${err.message}`);
      }
    } else {
      // Simulate Sandbox Webhook Verification (Developer Bypass)
      const parsedBody = JSON.parse(req.body.toString('utf8'));
      if (parsedBody.simulated && parsedBody.secret === 'SIMULATED_SECRET_KEY') {
        event = {
          id: parsedBody.id,
          event: parsedBody.type,
          payload: {
            payment: {
              entity: parsedBody.data.object
            }
          }
        };
      } else {
        console.error('Unauthorized Webhook POST: Signature missing or simulation secret invalid.');
        return res.status(401).send('Unauthorized webhook source.');
      }
    }

    const eventId = event.id;
    const eventType = event.event;

    // 2. Webhook Idempotency Check (The "Double Fire" Problem)
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { id: eventId }
    });

    if (existingEvent) {
      console.log(`Webhook Event ${eventId} already processed. Skipping duplicate handler.`);
      return res.status(200).json({ message: 'Event already processed (idempotent)' });
    }

    // Log the event to database to commit idempotency lock
    await prisma.webhookEvent.create({
      data: {
        id: eventId,
        gateway: process.env.RAZORPAY_KEY_ID ? 'RAZORPAY' : 'MOCK_SANDBOX'
      }
    });

    console.log(`Processing Webhook Event: ${eventType} (ID: ${eventId})`);

    // 3. Process Subscription Mutations on Order Paid or Payment Captured
    if (eventType === 'order.paid' || eventType === 'payment.captured') {
      const paymentObj = event.payload.payment?.entity || event.payload.order?.entity;
      
      // Extract metadata from notes
      let companyIdStr = null;
      let planCode = null;
      let gatewaySubscriptionId = paymentObj.order_id || paymentObj.id;
      let gatewayCustomerId = paymentObj.customer_id;
      let amountPaid = paymentObj.amount ? (paymentObj.amount / 100) : null;

      if (paymentObj.notes) {
        companyIdStr = paymentObj.notes.companyId;
        planCode = paymentObj.notes.planCode;
      }

      // If simulated fallback
      if (paymentObj.simulatedMetadata) {
        companyIdStr = paymentObj.simulatedMetadata.companyId;
        planCode = paymentObj.simulatedMetadata.planCode;
        amountPaid = paymentObj.simulatedMetadata.price;
      }

      if (!companyIdStr || !planCode) {
        console.error('Webhook missing metadata constraints:', paymentObj);
        return res.status(200).json({ error: 'Missing metadata' });
      }

      const companyId = parseInt(companyIdStr);
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { code: planCode }
      });

      if (!plan) {
        console.error(`Plan not found: ${planCode}`);
        return res.status(200).json({ error: 'Plan not found' });
      }

      // Calculate period boundaries (Monthly/Yearly)
      const periodStart = new Date();
      const periodEnd = new Date();
      if (plan.interval === 'YEARLY') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Create/Update Subscription in transactional safety
      await prisma.$transaction([
        prisma.subscription.upsert({
          where: { companyId },
          update: {
            planId: plan.id,
            status: 'ACTIVE',
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            gatewayName: process.env.RAZORPAY_KEY_ID ? 'RAZORPAY' : 'MOCK_SANDBOX',
            gatewayCustomerId,
            gatewaySubscriptionId,
            trialEndsAt: null
          },
          create: {
            companyId,
            planId: plan.id,
            status: 'ACTIVE',
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            gatewayName: process.env.RAZORPAY_KEY_ID ? 'RAZORPAY' : 'MOCK_SANDBOX',
            gatewayCustomerId,
            gatewaySubscriptionId,
            trialEndsAt: null
          }
        }),
        prisma.subscriptionInvoice.create({
          data: {
            subscription: { connect: { companyId } },
            invoiceNo: `SUB-INV-${eventId.substring(0, 10).toUpperCase()}`,
            amount: amountPaid || plan.price,
            status: 'PAID',
            billingDate: new Date()
          }
        })
      ]);

      // Evict local in-memory subscription cache
      clearSubscriptionCache(companyId);

      console.log(`Successfully updated Subscription to ACTIVE for Company ID: ${companyId}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook Handler Error:', error);
    res.status(500).send('Internal Webhook Error');
  }
};

/**
 * GET /api/billing/history
 * Returns the company's subscription invoice history.
 */
export const getBillingHistory = async (req, res) => {
  const companyId = req.user.companyId;
  try {
    const invoices = await prisma.subscriptionInvoice.findMany({
      where: {
        subscription: { companyId }
      },
      orderBy: { billingDate: 'desc' }
    });
    res.status(200).json(invoices);
  } catch (error) {
    console.error('Billing History Fetch Error:', error);
    res.status(500).json({ error: 'Failed to retrieve billing history.' });
  }
};
