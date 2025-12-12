/*
  Warnings:

  - You are about to alter the column `disassembleStatus` on the `service_process_record` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(12))` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `DamagedStock` ADD COLUMN `debitNoteId` VARCHAR(191) NULL,
    ADD COLUMN `invoiceNumber` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('Pending', 'Resolved') NOT NULL DEFAULT 'Pending';

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `debitNoteId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PurchaseOrderBill` ADD COLUMN `debitNoteId` VARCHAR(191) NULL,
    ADD COLUMN `invoiceNumber` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PurchaseOrderItem` ADD COLUMN `debitNoteId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PurchaseOrderReceipt` ADD COLUMN `debitNoteId` VARCHAR(191) NULL,
    ADD COLUMN `invoiceNumber` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ReturnToVendor` ADD COLUMN `debitNoteId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Service_Process_Record` MODIFY `disassembleStatus` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `DebitNote` (
    `id` VARCHAR(191) NOT NULL,
    `debitNoteNo` VARCHAR(191) NOT NULL,
    `financialYear` VARCHAR(191) NULL,
    `purchaseOrderId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `vendorName` VARCHAR(191) NULL,
    `bankDetailId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `drNoteDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `gstType` ENUM('IGST_5', 'IGST_12', 'IGST_18', 'IGST_28', 'IGST_EXEMPTED', 'LGST_5', 'LGST_12', 'LGST_18', 'LGST_28', 'LGST_EXEMPTED', 'IGST_ITEMWISE', 'LGST_ITEMWISE') NOT NULL,
    `gstRate` DECIMAL(5, 2) NULL,
    `currency` VARCHAR(191) NULL DEFAULT 'INR',
    `exchangeRate` DECIMAL(12, 4) NULL DEFAULT 1.0000,
    `foreignSubTotal` DECIMAL(12, 2) NULL,
    `foreignGrandTotal` DECIMAL(12, 2) NULL,
    `subTotal` DECIMAL(12, 2) NULL,
    `totalCGST` DECIMAL(12, 2) NULL,
    `totalSGST` DECIMAL(12, 2) NULL,
    `totalIGST` DECIMAL(12, 2) NULL,
    `totalGST` DECIMAL(12, 2) NULL,
    `grandTotal` DECIMAL(12, 2) NULL,
    `status` ENUM('Pending', 'Received') NOT NULL DEFAULT 'Pending',
    `remarks` VARCHAR(191) NULL,
    `pdfUrl` VARCHAR(191) NULL,
    `pdfName` VARCHAR(191) NULL,
    `pdfGeneratedAt` DATETIME(3) NULL,
    `pdfGeneratedBy` VARCHAR(191) NULL,
    `orgInvoiceNo` VARCHAR(191) NULL,
    `orgInvoiceDate` DATETIME(3) NULL,
    `gr_rr_no` VARCHAR(191) NULL,
    `transport` VARCHAR(191) NULL,
    `vehicleNumber` VARCHAR(191) NULL,
    `station` VARCHAR(191) NULL,
    `otherCharges` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DebitNote_debitNoteNo_key`(`debitNoteNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PurchaseOrderItem` ADD CONSTRAINT `PurchaseOrderItem_debitNoteId_fkey` FOREIGN KEY (`debitNoteId`) REFERENCES `DebitNote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderReceipt` ADD CONSTRAINT `PurchaseOrderReceipt_debitNoteId_fkey` FOREIGN KEY (`debitNoteId`) REFERENCES `DebitNote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DamagedStock` ADD CONSTRAINT `DamagedStock_debitNoteId_fkey` FOREIGN KEY (`debitNoteId`) REFERENCES `DebitNote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderBill` ADD CONSTRAINT `PurchaseOrderBill_debitNoteId_fkey` FOREIGN KEY (`debitNoteId`) REFERENCES `DebitNote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitNote` ADD CONSTRAINT `DebitNote_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitNote` ADD CONSTRAINT `DebitNote_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitNote` ADD CONSTRAINT `DebitNote_bankDetailId_fkey` FOREIGN KEY (`bankDetailId`) REFERENCES `BankDetail`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitNote` ADD CONSTRAINT `DebitNote_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnToVendor` ADD CONSTRAINT `ReturnToVendor_debitNoteId_fkey` FOREIGN KEY (`debitNoteId`) REFERENCES `DebitNote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_debitNoteId_fkey` FOREIGN KEY (`debitNoteId`) REFERENCES `DebitNote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
