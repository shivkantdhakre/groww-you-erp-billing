import { PrismaClient, Prisma } from "@prisma/client";
import { contextStorage } from "./context.js";

const basePrisma = new PrismaClient();

// Models requiring companyId filtering (Multi-Tenancy)
const modelsWithCompany = [
  'Customer', 'Vendor', 'Item', 'Invoice', 'StockMovement', 
  'FinancialTransaction', 'Voucher', 'Return', 'Notification', 'Branch'
];

// Models requiring branchId filtering (Branch Isolation)
const modelsWithBranch = [
  'Invoice', 'StockMovement', 'FinancialTransaction', 'Voucher', 'Return', 'BranchStock'
];

// Helper to check if a where clause is a simple unique search shape (no nested relation objects or operators)
const isSimpleUniqueWhere = (where) => {
  if (!where || typeof where !== 'object') return false;
  for (const key of Object.keys(where)) {
    const val = where[key];
    if (val && typeof val === 'object') {
      // If it's a composite key, verify its properties are primitives
      if (key.includes('_')) {
        for (const subKey of Object.keys(val)) {
          const subVal = val[subKey];
          if (subVal && typeof subVal === 'object') {
            return false;
          }
        }
      } else {
        // Any other nested object (e.g., relation queries or operators) is not simple
        return false;
      }
    }
  }
  return true;
};

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const store = contextStorage.getStore();
        const user = store?.user;

        let didInject = false;

        // 1. Read Operations Isolation (findMany, findFirst, findUnique, count, aggregate, groupBy)
        if ([
          'findMany', 'findFirst', 'findUnique', 'count', 
          'aggregate', 'groupBy'
        ].includes(operation)) {
          
          args.where = args.where || {};

          // Apply Company ID Filter (RLS)
          if (modelsWithCompany.includes(model) && user?.companyId) {
            if (args.where.companyId !== user.companyId) {
              args.where.companyId = user.companyId;
              didInject = true;
            }
          }

          // Apply Branch ID Filter (RLS)
          if (modelsWithBranch.includes(model)) {
            const isCompanyOrSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';
            
            if (!isCompanyOrSuperAdmin) {
              // If a staff user has no branch context, throw 403 Forbidden
              if (!user?.branchId) {
                const err = new Error('Access Denied: Missing branch context');
                err.status = 403;
                throw err;
              }
              // Force restrict to the user's branchId
              if (args.where.branchId !== user.branchId) {
                args.where.branchId = user.branchId;
                didInject = true;
              }
            } else {
              // Admin roles:
              // Apply branchId filter only if they are in a specific branch context
              if (user?.branchId) {
                if (args.where.branchId !== user.branchId) {
                  args.where.branchId = user.branchId;
                  didInject = true;
                }
              }
            }
          }

          // Convert findUnique to findFirst to support non-unique filtering (like companyId / branchId)
          if (operation === 'findUnique' && didInject && isSimpleUniqueWhere(args.where)) {
            const newArgs = { ...args };
            newArgs.where = { ...newArgs.where };
            for (const key of Object.keys(newArgs.where)) {
              if (key.includes('_') && typeof newArgs.where[key] === 'object' && newArgs.where[key] !== null) {
                Object.assign(newArgs.where, newArgs.where[key]);
                delete newArgs.where[key];
              }
            }
            
            const clientModelName = model.charAt(0).toLowerCase() + model.slice(1);
            const client = Prisma.getExtensionContext(this) || prisma;
            return client[clientModelName].findFirst(newArgs);
          }
        }

        // 2. Write Protections (update, delete, updateMany, deleteMany)
        if (['update', 'delete', 'updateMany', 'deleteMany'].includes(operation)) {
          if (user) {
            const isCompanyOrSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';

            args.where = args.where || {};

            // Apply Company ID Filter (RLS)
            if (modelsWithCompany.includes(model) && user.companyId) {
              args.where.companyId = user.companyId;
            }

            // Apply Branch ID Filter (RLS)
            if (modelsWithBranch.includes(model)) {
              if (!isCompanyOrSuperAdmin) {
                if (!user.branchId) {
                  const err = new Error('Access Denied: Missing branch context');
                  err.status = 403;
                  throw err;
                }
                args.where.branchId = user.branchId;
              } else if (user.branchId) {
                args.where.branchId = user.branchId;
              }
            }

            // For single updates/deletes, map missing/unauthorized records to 404
            if (['update', 'delete'].includes(operation)) {
              try {
                return await query(args);
              } catch (err) {
                if (err.code === 'P2025') {
                  const customErr = new Error(`${model} not found or unauthorized`);
                  customErr.status = 404;
                  throw customErr;
                }
                throw err;
              }
            }
          }
        }

        // 3. Create Protections
        if (['create', 'createMany'].includes(operation)) {
          if (user) {
            const isCompanyOrSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';
            const dataList = operation === 'createMany' ? (Array.isArray(args.data) ? args.data : [args.data]) : [args.data];

            for (const data of dataList) {
              if (modelsWithCompany.includes(model) && user.companyId) {
                if (data.companyId && data.companyId !== user.companyId) {
                  throw new Error('Tenant Mismatch: Cannot create record for another company');
                }
                data.companyId = user.companyId;
              }

              if (modelsWithBranch.includes(model)) {
                if (!isCompanyOrSuperAdmin) {
                  if (!user.branchId) {
                    const err = new Error('Access Denied: Missing branch context');
                    err.status = 403;
                    throw err;
                  }
                  if (data.branchId && data.branchId !== user.branchId) {
                    throw new Error('Branch Mismatch: Staff cannot create record for another branch');
                  }
                  data.branchId = user.branchId;
                } else {
                  if (user.branchId && !data.branchId) {
                    data.branchId = user.branchId;
                  }
                  if (data.branchId) {
                    const branch = await basePrisma.branch.findFirst({
                      where: { id: data.branchId, companyId: user.companyId }
                    });
                    if (!branch) {
                      throw new Error('Invalid branch specified for company');
                    }
                  }
                }
              }
            }
          }
        }

        return query(args);
      }
    }
  }
});

export default prisma;
