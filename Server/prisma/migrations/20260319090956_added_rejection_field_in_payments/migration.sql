/*
  Warnings:

  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.

*/
-- -- DropForeignKey
-- ALTER TABLE `purchaseorderbill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- -- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `purchaseorderbill`;

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `paymentRejected` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `paymentRejectedAt` DATETIME(3) NULL,
    ADD COLUMN `paymentRejectedBy` VARCHAR(191) NULL;

-- AlterTable
-- ALTER TABLE `purchaseorderbill` DROP COLUMN `debitNoteId`;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_paymentRejectedBy_fkey` FOREIGN KEY (`paymentRejectedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
