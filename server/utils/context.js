import { AsyncLocalStorage } from 'async_hooks';

// Singleton instance to propagate req.user context down to the Prisma layer
export const contextStorage = new AsyncLocalStorage();
