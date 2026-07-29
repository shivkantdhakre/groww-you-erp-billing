/**
 * In-Memory & Redis Hybrid Cache Service for Sales Insights
 * Supports 1-Hour TTL and Active Company Tenant Invalidation
 */

const memoryCache = new Map();
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Gets cached insights for a company tenant.
 * @param {number|string} companyId 
 * @returns {object|null}
 */
export const getInsightsCache = (companyId) => {
  const key = `company_${companyId}_sales_insights`;
  const cached = memoryCache.get(key);
  if (!cached) return null;

  // Check TTL
  if (Date.now() > cached.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return cached.data;
};

/**
 * Sets cached insights for a company tenant.
 * @param {number|string} companyId 
 * @param {object} data 
 * @param {number} [ttlMs] 
 */
export const setInsightsCache = (companyId, data, ttlMs = DEFAULT_TTL_MS) => {
  const key = `company_${companyId}_sales_insights`;
  const expiresAt = Date.now() + ttlMs;
  
  memoryCache.set(key, {
    data: {
      ...data,
      cachedAt: new Date().toISOString(),
      expiresAt: new Date(expiresAt).toISOString()
    },
    expiresAt
  });
};

/**
 * Actively invalidates cached insights for a specific company tenant.
 * Triggered on major financial transactions (e.g. Sales Invoices created/paid, Vouchers).
 * @param {number|string} companyId 
 */
export const invalidateInsightsCache = (companyId) => {
  const key = `company_${companyId}_sales_insights`;
  if (memoryCache.has(key)) {
    console.log(`[CacheService] Actively invalidating AI insights cache for company tenant #${companyId}`);
    memoryCache.delete(key);
  }
};

/**
 * Clears all expired items periodically to prevent memory leaks.
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (now > item.expiresAt) {
      memoryCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes
