/*
  Warnings:

  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.

*/
-- DropForeignKey
-- ALTER TABLE `purchaseorderbill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- -- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `purchaseorderbill`;

-- -- AlterTable
-- ALTER TABLE `purchaseorderbill` DROP COLUMN `debitNoteId`;

-- CreateTable
CREATE TABLE `DirectItemIssue` (
    `id` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NULL,
    `serviceProcessId` VARCHAR(191) NULL,
    `isProcessIssue` BOOLEAN NOT NULL DEFAULT false,
    `rawMaterialIssued` JSON NULL,
    `issuedTo` VARCHAR(191) NULL,
    `issuedBy` VARCHAR(191) NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `remarks` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NULL,
    `updatedBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DirectItemIssue` ADD CONSTRAINT `DirectItemIssue_serviceProcessId_fkey` FOREIGN KEY (`serviceProcessId`) REFERENCES `Service_Process_Record`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DirectItemIssue` ADD CONSTRAINT `DirectItemIssue_issuedTo_fkey` FOREIGN KEY (`issuedTo`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DirectItemIssue` ADD CONSTRAINT `DirectItemIssue_issuedBy_fkey` FOREIGN KEY (`issuedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DirectItemIssue` ADD CONSTRAINT `DirectItemIssue_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
