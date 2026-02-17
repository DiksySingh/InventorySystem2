/*
  Warnings:

  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.

*/
-- DropForeignKey
-- ALTER TABLE `purchaseorderbill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- -- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `purchaseorderbill`;

-- AlterTable
ALTER TABLE `DirectItemIssue` ADD COLUMN `materialIssued` JSON NULL;

-- AlterTable
ALTER TABLE `ItemUsage` ADD COLUMN `itemId` VARCHAR(191) NULL,
    ADD COLUMN `itemType` ENUM('RAW', 'INFRA', 'TOOL', 'INSTALLATION') NULL;

-- AlterTable
-- ALTER TABLE `purchaseorderbill` DROP COLUMN `debitNoteId`;

-- AlterTable
ALTER TABLE `StockMovement` ADD COLUMN `itemId` VARCHAR(191) NULL,
    ADD COLUMN `itemType` ENUM('RAW', 'INFRA', 'TOOL', 'INSTALLATION') NULL;

-- AlterTable
ALTER TABLE `UserItemStock` ADD COLUMN `itemId` VARCHAR(191) NULL,
    ADD COLUMN `itemType` ENUM('RAW', 'INFRA', 'TOOL', 'INSTALLATION') NULL;

-- AlterTable
ALTER TABLE `WarehouseStock` ADD COLUMN `itemId` VARCHAR(191) NULL,
    MODIFY `itemType` ENUM('RAW', 'INFRA', 'TOOL', 'INSTALLATION') NULL;
