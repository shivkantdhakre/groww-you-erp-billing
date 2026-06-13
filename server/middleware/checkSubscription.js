import prisma from '../utils/prisma.js';

export const checkSubscription = async (req, res, next) => {
  // Allow system-level administrators to bypass checks
  if (req.user?.role === 'SUPER_ADMIN') {
    return next();
  }

  const subscription = req.user?.subscription;

  if (!subscription) {
    return res.status(403).json({ 
      error: 'NO_ACTIVE_SUBSCRIPTION', 
      message: 'Access denied: No subscription record found for this company.' 
    });
  }

  const { planCode, status, currentPeriodEnd, branchLimit, features } = subscription;
  const now = new Date();
  const periodEnd = new Date(currentPeriodEnd);

  // 1. Enforce Subscription Status Check
  if (status === 'EXPIRED' || status === 'UNPAID') {
    return res.status(402).json({
      error: 'SUBSCRIPTION_EXPIRED',
      message: 'Access Denied: Your subscription plan has expired. Upgrade your plan to resume ERP operations.'
    });
  }

  // 2. Dunning Grace Period (3 days past due allowed)
  if (status === 'PAST_DUE') {
    const gracePeriodEnd = new Date(periodEnd);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

    if (now > gracePeriodEnd) {
      return res.status(402).json({
        error: 'SUBSCRIPTION_EXPIRED',
        message: 'Access Denied: Your account renewal payment is past due. Billing operations are locked until payment is completed.'
      });
    }
  } else {
    // Standard status expiration check
    if (now > periodEnd) {
      return res.status(402).json({
        error: 'SUBSCRIPTION_EXPIRED',
        message: 'Access Denied: Your subscription plan has expired. Upgrade your plan to resume ERP operations.'
      });
    }
  }

  // 3. Resource Limit Guards (triggered only on resource creations)
  
  // A. Create Branch Limit Guard
  if (req.path === '/' && req.method === 'POST' && req.baseUrl.includes('branches')) {
    try {
      const branchCount = await prisma.branch.count({
        where: { companyId: req.user.companyId }
      });

      if (branchCount >= branchLimit) {
        return res.status(403).json({
          error: 'LIMIT_EXCEEDED',
          message: `Branch limit reached: Your current plan only supports up to ${branchLimit} branches. Upgrade your plan to add more branches.`
        });
      }
    } catch (err) {
      console.error('Branch limit check failed:', err);
    }
  }

  // B. Create Invoice Count Limit Guard (e.g. Trial limit of 100 invoices/month)
  if (req.path.includes('invoice') && req.method === 'POST') {
    if (features?.maxInvoicesPerMonth) {
      try {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const invoiceCount = await prisma.invoice.count({
          where: {
            companyId: req.user.companyId,
            createdAt: { gte: startOfMonth }
          }
        });

        if (invoiceCount >= features.maxInvoicesPerMonth) {
          return res.status(403).json({
            error: 'LIMIT_EXCEEDED',
            message: `Invoice limit reached: Your current plan only supports up to ${features.maxInvoicesPerMonth} invoices per month. Upgrade your plan to continue billing.`
          });
        }
      } catch (err) {
        console.error('Invoice count limit check failed:', err);
      }
    }
  }

  // 4. Feature Toggle Checks
  if (req.baseUrl.includes('compliance')) {
    if (req.path.includes('/gst/') && !features?.gstFiling) {
      return res.status(403).json({
        error: 'FEATURE_RESTRICTED',
        message: 'Restricted: GST Filing is a Professional tier feature. Upgrade your subscription plan to unlock.'
      });
    }

    if (req.path.includes('/ewaybill/') && !features?.ewayBill) {
      return res.status(403).json({
        error: 'FEATURE_RESTRICTED',
        message: 'Restricted: E-Way Bill generation is a Professional tier feature. Upgrade your subscription plan to unlock.'
      });
    }
  }

  next();
};
