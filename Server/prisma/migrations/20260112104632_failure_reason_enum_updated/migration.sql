/*
  Warnings:

  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.

*/
-- DropForeignKey
-- ALTER TABLE `purchaseorderbill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- -- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `purchaseorderbill`;

-- AlterTable
ALTER TABLE `FailureRedirect` MODIFY `failureReason` ENUM('VIBRATION', 'OVERLOAD', 'EARTHING', 'LEAKAGE', 'HIGH_PLAY', 'NOISE', 'REJECTED', 'OTHER') NOT NULL;

-- -- AlterTable
-- ALTER TABLE `purchaseorderbill` DROP COLUMN `debitNoteId`;

-- AlterTable
ALTER TABLE `StageActivity` MODIFY `failureReason` ENUM('VIBRATION', 'OVERLOAD', 'EARTHING', 'LEAKAGE', 'HIGH_PLAY', 'NOISE', 'REJECTED', 'OTHER') NULL;
