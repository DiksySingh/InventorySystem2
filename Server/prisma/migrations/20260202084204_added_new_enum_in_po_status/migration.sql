/*
  Warnings:

  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.

*/
-- -- DropForeignKey
-- ALTER TABLE `purchaseorderbill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- -- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `purchaseorderbill`;

-- AlterTable
ALTER TABLE `PurchaseOrder` MODIFY `status` ENUM('Draft', 'Generated_Downloaded', 'Approval_Sent', 'Admin_Approved', 'Admin_Rejected', 'PartiallyReceived', 'Received', 'Cancelled') NOT NULL DEFAULT 'Draft';

-- AlterTable
-- ALTER TABLE `purchaseorderbill` DROP COLUMN `debitNoteId`;
