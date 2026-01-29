/*
  Warnings:

  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.

*/
-- DropForeignKey
-- ALTER TABLE `purchaseorderbill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- -- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `purchaseorderbill`;

-- AlterTable
-- ALTER TABLE `purchaseorderbill` DROP COLUMN `debitNoteId`;

-- CreateTable
CREATE TABLE `VendorInvoices` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `poId` VARCHAR(191) NULL,
    `invoiceUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VendorInvoices` ADD CONSTRAINT `VendorInvoices_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorInvoices` ADD CONSTRAINT `VendorInvoices_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
