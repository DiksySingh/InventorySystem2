/*
  Warnings:

  - You are about to drop the column `userId` on the `damagedstock` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `debitnote` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(14))` to `Enum(EnumId(12))`.
  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.

*/
-- DropForeignKey
-- ALTER TABLE `DamagedStock` DROP FOREIGN KEY `DamagedStock_userId_fkey`;

-- DropForeignKey
-- ALTER TABLE `PurchaseOrderBill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- DropIndex
-- DROP INDEX `DamagedStock_userId_fkey` ON `DamagedStock`;

-- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `PurchaseOrderBill`;

-- AlterTable
ALTER TABLE `DamagedStock` DROP COLUMN `userId`,
    MODIFY `status` ENUM('Pending', 'Debited', 'Resolved') NOT NULL DEFAULT 'Pending';

-- AlterTable
ALTER TABLE `DebitNote` ADD COLUMN `billReference` VARCHAR(191) NULL,
    MODIFY `status` ENUM('Debited', 'PartiallyReceived', 'Received', 'Cancelled') NOT NULL DEFAULT 'Debited';

-- AlterTable
-- ALTER TABLE `PurchaseOrderBill` DROP COLUMN `debitNoteId`;
