import { PrismaClient } from "@prisma/client";
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

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const store = contextStorage.getStore();
        const user = store?.user;

        // 1. Read Operations Isolation (findMany, findFirst, findUnique, count, aggregate, groupBy)
        if ([
          'findMany', 'findFirst', 'findUnique', 'count', 
          'aggregate', 'groupBy'
        ].includes(operation)) {
          
          args.where = args.where || {};

          // Apply Company ID Filter (RLS)
          if (modelsWithCompany.includes(model) && user?.companyId) {
            args.where.companyId = user.companyId;
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
              args.where.branchId = user.branchId;
            } else {
              // Admin roles:
              // Apply branchId filter only if they are in a specific branch context
              if (user?.branchId) {
                args.where.branchId = user.branchId;
              }
            }
          }

          // Convert findUnique to findFirst to support non-unique filtering (like companyId / branchId)
          if (operation === 'findUnique') {
            const clientModelName = model.charAt(0).toLowerCase() + model.slice(1);
            return basePrisma[clientModelName].findFirst(args);
          }
        }

        // 2. Write Protections (update, delete, updateMany, deleteMany)
        if (['update', 'delete', 'updateMany', 'deleteMany'].includes(operation)) {
          if (user) {
            const clientModelName = model.charAt(0).toLowerCase() + model.slice(1);
            const isCompanyOrSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN';

            // For update and delete (single record), check ownership before writing (concurrency-safe via base client)
            if (['update', 'delete'].includes(operation) && args.where?.id) {
              const recordId = parseInt(args.where.id);
              if (!isNaN(recordId)) {
                const record = await basePrisma[clientModelName].findFirst({
                  where: {
                    id: recordId,
                    ...(modelsWithCompany.includes(model) && user.companyId ? { companyId: user.companyId } : {}),
                    ...(modelsWithBranch.includes(model) && !isCompanyOrSuperAdmin ? { branchId: user.branchId } : {}),
                    ...(modelsWithBranch.includes(model) && isCompanyOrSuperAdmin && user.branchId ? { branchId: user.branchId } : {})
                  }
                });

                if (!record) {
                  const err = new Error(`${model} not found or unauthorized`);
                  err.status = 404;
                  throw err;
                }
              }
            }

            // For updateMany and deleteMany, inject the filters directly into args.where
            if (['updateMany', 'deleteMany'].includes(operation)) {
              args.where = args.where || {};
              if (modelsWithCompany.includes(model) && user.companyId) {
                args.where.companyId = user.companyId;
              }
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
