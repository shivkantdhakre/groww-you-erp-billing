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
 * Helper to fetch the maximum existing numeric value in the database for the given type.
 */
const getMaxExistingValue = async (companyId, branchId, type, tx) => {
  let record = null;
  let numberField = "";

  if (type === SEQUENCE_TYPES.SALE_INVOICE) {
    record = await tx.invoice.findFirst({
      where: { companyId, branchId, invoiceType: "SALE" },
      orderBy: { id: "desc" }
    });
    numberField = "invoiceNo";
  } else if (type === SEQUENCE_TYPES.PURCHASE_INVOICE) {
    record = await tx.invoice.findFirst({
      where: { companyId, branchId, invoiceType: "PURCHASE" },
      orderBy: { id: "desc" }
    });
    numberField = "invoiceNo";
  } else if (type === SEQUENCE_TYPES.SALE_RETURN) {
    record = await tx.return.findFirst({
      where: { companyId, branchId, returnType: "SALE" },
      orderBy: { id: "desc" }
    });
    numberField = "returnNo";
  } else if (type === SEQUENCE_TYPES.PURCHASE_RETURN) {
    record = await tx.return.findFirst({
      where: { companyId, branchId, returnType: "PURCHASE" },
      orderBy: { id: "desc" }
    });
    numberField = "returnNo";
  } else if (type === SEQUENCE_TYPES.PAYMENT_VOUCHER) {
    record = await tx.voucher.findFirst({
      where: { companyId, branchId, type: "PAYMENT" },
      orderBy: { id: "desc" }
    });
    numberField = "voucherNo";
  } else if (type === SEQUENCE_TYPES.RECEIPT_VOUCHER) {
    record = await tx.voucher.findFirst({
      where: { companyId, branchId, type: "RECEIPT" },
      orderBy: { id: "desc" }
    });
    numberField = "voucherNo";
  } else if (type === SEQUENCE_TYPES.CONTRA_VOUCHER) {
    record = await tx.voucher.findFirst({
      where: { companyId, branchId, type: "CONTRA" },
      orderBy: { id: "desc" }
    });
    numberField = "voucherNo";
  } else if (type === SEQUENCE_TYPES.JOURNAL_VOUCHER) {
    record = await tx.voucher.findFirst({
      where: { companyId, branchId, type: "JOURNAL" },
      orderBy: { id: "desc" }
    });
    numberField = "voucherNo";
  }

  if (record && record[numberField]) {
    const match = record[numberField].match(/\d+$/);
    return match ? parseInt(match[0], 10) : 0;
  }

  return 0;
};

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

  // Atomically increment/create the sequence value.
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

  // Self-heal: If the sequence number is behind the actual max existing number in the DB,
  // synchronize it immediately to maxExisting + 1 to prevent unique constraint violations.
  const maxExisting = await getMaxExistingValue(companyId, branchId, type, tx);
  if (seq.value <= maxExisting) {
    const nextVal = maxExisting + 1;
    const updatedSeq = await tx.sequence.update({
      where: {
        id: seq.id
      },
      data: {
        value: nextVal
      }
    });
    return updatedSeq.value;
  }

  return seq.value;
};
