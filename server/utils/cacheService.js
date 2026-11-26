/**
 * In-Memory Cache Service for AI Pipeline Insights
 * Supports 1-Hour TTL, Branch Scoping, and Active Company Tenant Invalidation
 */

const memoryCache = new Map();
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

const buildCacheKey = (companyId, branchId = null) => {
  const branchScope = branchId ?? "all";
  return `company_${companyId}_branch_${branchScope}_sales_insights`;
};

/**
 * Gets cached insights for a company tenant (and optional branch scope).
 * @param {number|string} companyId
 * @param {number|string|null} [branchId]
 * @returns {object|null}
 */
export const getInsightsCache = (companyId, branchId = null) => {
  const key = buildCacheKey(companyId, branchId);
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
 * Sets cached insights for a company tenant (and optional branch scope).
 * @param {number|string} companyId
 * @param {object} data
 * @param {{ branchId?: number|string|null, ttlMs?: number }|number} [options]
 */
export const setInsightsCache = (companyId, data, options = {}) => {
  const normalizedOptions = typeof options === "number" ? { ttlMs: options } : (options || {});
  const branchId = normalizedOptions.branchId ?? null;
  const ttlMs = normalizedOptions.ttlMs ?? DEFAULT_TTL_MS;
  const key = buildCacheKey(companyId, branchId);
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
 * Actively invalidates cached insights for a specific company tenant (and optional branch).
 * Triggered on major financial transactions (e.g. Sales Invoices created/paid, Vouchers).
 * When branchId is omitted/null, clears every cached scope for the company tenant.
 * @param {number|string} companyId
 * @param {number|string|null} [branchId]
 */
export const invalidateInsightsCache = (companyId, branchId = null) => {
  if (branchId !== null && branchId !== undefined) {
    const branchKey = buildCacheKey(companyId, branchId);
    const allKey = buildCacheKey(companyId, null);
    memoryCache.delete(branchKey);
    memoryCache.delete(allKey);
    return;
  }

  const companyPrefix = `company_${companyId}_`;
  let clearedCount = 0;
  for (const key of memoryCache.keys()) {
    if (key.startsWith(companyPrefix)) {
      memoryCache.delete(key);
      clearedCount++;
    }
  }
  if (clearedCount > 0) {
    console.log(`[CacheService] Actively invalidated ${clearedCount} AI insights cache scope(s) for company tenant #${companyId}`);
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
