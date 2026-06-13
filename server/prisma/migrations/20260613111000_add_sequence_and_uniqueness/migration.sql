-- CreateTable
CREATE TABLE "Sequence" (
    "id" SERIAL NOT NULL,
    "companyId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sequence_companyId_branchId_type_key" ON "Sequence"("companyId", "branchId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_companyId_branchId_invoiceType_invoiceNo_key" ON "Invoice"("companyId", "branchId", "invoiceType", "invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "Return_companyId_branchId_returnType_returnNo_key" ON "Return"("companyId", "branchId", "returnType", "returnNo");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_companyId_branchId_type_voucherNo_key" ON "Voucher"("companyId", "branchId", "type", "voucherNo");

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sequence" ADD CONSTRAINT "Sequence_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
