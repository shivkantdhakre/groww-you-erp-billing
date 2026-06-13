import prisma from '../utils/prisma.js';

// Local, in-memory cache for subscription data
// Key: companyId (number), Value: { subscription, expiresAt (Date) }
// NOTE: This cache is local-only to this single server instance.
// For horizontal scaling (multi-instance/pods), replace this Map with Redis.
const subscriptionCache = new Map();

/**
 * Helper to manually invalidate/clear the subscription cache for a company
 * @param {number} companyId 
 */
export const clearSubscriptionCache = (companyId) => {
  if (subscriptionCache.has(companyId)) {
    subscriptionCache.delete(companyId);
    console.log(`[Subscription Cache] Evicted cached record for Company ID: ${companyId}`);
  }
};

/**
 * Internal helper to retrieve active subscription from DB or Cache
 */
const getCompanySubscription = async (companyId) => {
  const now = new Date();
  const cached = subscriptionCache.get(companyId);

  if (cached && cached.expiresAt > now) {
    return cached.subscription;
  }

  // Fetch fresh record from DB
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    include: { plan: true }
  });

  if (subscription) {
    // Cache for 1 minute
    subscriptionCache.set(companyId, {
      subscription,
      expiresAt: new Date(Date.now() + 60 * 1000)
    });
  }

  return subscription;
};

/**
 * Helper to generate standardized error payload
 */
const sendStandardError = (res, status, error, message) => {
  return res.status(status).json({
    error,
    message,
    status
  });
};

/**
 * Middleware: Enforces overall subscription status, trials, and dunning grace periods.
 * Attach to routes that require active tenancy billing access.
 */
export const checkSubscription = async (req, res, next) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    return next();
  }

  const companyId = req.user?.companyId;
  if (!companyId) {
    return sendStandardError(res, 401, 'UNAUTHORIZED', 'Access Denied: Missing tenant identity.');
  }

  try {
    const sub = await getCompanySubscription(companyId);

    if (!sub) {
      return sendStandardError(res, 403, 'NO_ACTIVE_SUBSCRIPTION', 'Access Denied: No active subscription record found for this company.');
    }

    const now = new Date();
    const periodEnd = new Date(sub.currentPeriodEnd);

    // 1. Check direct expiration states
    if (sub.status === 'EXPIRED' || sub.status === 'UNPAID') {
      return sendStandardError(res, 402, 'SUBSCRIPTION_EXPIRED', 'Access Denied: Your subscription plan has expired. Upgrade your plan to resume ERP operations.');
    }

    // 2. Dunning Grace Period (3 days past due allowed)
    if (sub.status === 'PAST_DUE') {
      const gracePeriodEnd = new Date(periodEnd);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

      if (now > gracePeriodEnd) {
        return sendStandardError(res, 402, 'SUBSCRIPTION_EXPIRED', 'Access Denied: Your account renewal payment is past due. Billing operations are locked until payment is completed.');
      }
    } else {
      // Standard expiration check
      if (now > periodEnd) {
        return sendStandardError(res, 402, 'SUBSCRIPTION_EXPIRED', 'Access Denied: Your subscription plan has expired. Upgrade your plan to resume ERP operations.');
      }
    }

    // Expose fresh subscription parameters on the request object for downstream controllers/middlewares
    req.subscription = sub;
    next();
  } catch (err) {
    console.error('Subscription validation failed:', err);
    return sendStandardError(res, 500, 'INTERNAL_ERROR', 'Failed to validate subscription access.');
  }
};

/**
 * Middleware: Enforces Branch Creation Limits based on the active plan.
 * Attach specifically to POST /api/branches.
 */
export const limitBranchCount = async (req, res, next) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    return next();
  }

  const companyId = req.user?.companyId;
  const sub = req.subscription || await getCompanySubscription(companyId);

  if (!sub) {
    return sendStandardError(res, 403, 'NO_ACTIVE_SUBSCRIPTION', 'Access Denied: No active subscription found.');
  }

  try {
    const branchCount = await prisma.branch.count({
      where: { companyId }
    });

    const branchLimit = sub.plan.branchLimit;

    if (branchCount >= branchLimit) {
      return sendStandardError(
        res,
        403,
        'LIMIT_EXCEEDED',
        `Branch limit reached: Your current plan only supports up to ${branchLimit} branches. Upgrade your plan to add more branches.`
      );
    }

    next();
  } catch (err) {
    console.error('Branch count limit check failed:', err);
    return sendStandardError(res, 500, 'INTERNAL_ERROR', 'Failed to verify branch limits.');
  }
};

/**
 * Middleware: Enforces Monthly Invoice Limits based on the active plan.
 * Attach specifically to POST /api/transactions/sales-invoices and POST /api/transactions/purchase-invoices.
 */
export const limitInvoiceCount = async (req, res, next) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    return next();
  }

  const companyId = req.user?.companyId;
  const sub = req.subscription || await getCompanySubscription(companyId);

  if (!sub) {
    return sendStandardError(res, 403, 'NO_ACTIVE_SUBSCRIPTION', 'Access Denied: No active subscription found.');
  }

  const maxInvoices = sub.plan.features?.maxInvoicesPerMonth;

  if (maxInvoices) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const invoiceCount = await prisma.invoice.count({
        where: {
          companyId,
          createdAt: { gte: startOfMonth }
        }
      });

      if (invoiceCount >= maxInvoices) {
        return sendStandardError(
          res,
          403,
          'LIMIT_EXCEEDED',
          `Invoice limit reached: Your current plan only supports up to ${maxInvoices} invoices per month. Upgrade your plan to continue billing.`
        );
      }
    } catch (err) {
      console.error('Invoice count limit check failed:', err);
      return sendStandardError(res, 500, 'INTERNAL_ERROR', 'Failed to verify invoice limits.');
    }
  }

  next();
};

/**
 * Higher-Order Middleware: Enforces Premium Feature Toggle flags.
 * Usage: requireFeature('gstFiling') or requireFeature('ewayBill').
 */
export const requireFeature = (featureName) => {
  return async (req, res, next) => {
    if (req.user?.role === 'SUPER_ADMIN') {
      return next();
    }

    const companyId = req.user?.companyId;
    const sub = req.subscription || await getCompanySubscription(companyId);

    if (!sub) {
      return sendStandardError(res, 403, 'NO_ACTIVE_SUBSCRIPTION', 'Access Denied: No active subscription found.');
    }

    const features = sub.plan.features || {};
    const isAllowed = !!features[featureName];

    if (!isAllowed) {
      const featureLabel = featureName === 'gstFiling' ? 'GST Filing' : featureName === 'ewayBill' ? 'E-Way Bill' : featureName;
      return sendStandardError(
        res,
        403,
        'FEATURE_RESTRICTED',
        `Restricted: ${featureLabel} is a Professional tier feature. Upgrade your subscription plan to unlock.`
      );
    }

    next();
  };
};
