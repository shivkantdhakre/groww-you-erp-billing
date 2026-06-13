export const SEQUENCE_TYPES = {
  SALE_INVOICE: "SALE_INVOICE",
  PURCHASE_INVOICE: "PURCHASE_INVOICE",
  SALE_RETURN: "SALE_RETURN",
  PURCHASE_RETURN: "PURCHASE_RETURN",
  PAYMENT_VOUCHER: "PAYMENT_VOUCHER",
  RECEIPT_VOUCHER: "RECEIPT_VOUCHER",
  CONTRA_VOUCHER: "CONTRA_VOUCHER",
  JOURNAL_VOUCHER: "JOURNAL_VOUCHER"
};

const VALID_SEQUENCE_TYPES = Object.values(SEQUENCE_TYPES);

/**
 * Atomically increments and returns the next value in the sequence for a company and branch.
 * Must be executed within a Prisma transaction block to ensure concurrency safety.
 * 
 * @param {number} companyId - Tenant Company ID
 * @param {number} branchId - Branch ID
 * @param {string} type - The Sequence Type (from SEQUENCE_TYPES)
 * @param {object} tx - Prisma transactional client instance
 * @returns {Promise<number>} The next integer value in the sequence
 */
export const getSequenceNextValue = async (companyId, branchId, type, tx) => {
  if (!tx) {
    throw new Error("Transaction client (tx) is required for sequence generation.");
  }

  if (!VALID_SEQUENCE_TYPES.includes(type)) {
    throw new Error(`Invalid sequence type specified: ${type}`);
  }

  // Atomically increment the sequence value.
  // Using Prisma upsert on a unique constraint inside a transaction enforces
  // a row-level lock (FOR UPDATE) in PostgreSQL, making it 100% thread-safe.
  const seq = await tx.sequence.upsert({
    where: {
      companyId_branchId_type: {
        companyId,
        branchId,
        type
      }
    },
    update: {
      value: { increment: 1 }
    },
    create: {
      companyId,
      branchId,
      type,
      value: 1
    }
  });

  return seq.value;
};
