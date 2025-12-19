/*
  Warnings:

  - You are about to alter the column `subTotal` on the `purchaseorder` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `foreignGrandTotal` on the `purchaseorder` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `foreignSubTotal` on the `purchaseorder` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.
  - You are about to alter the column `rate` on the `purchaseorderitem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(12,4)`.
  - You are about to alter the column `total` on the `purchaseorderitem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `amountInForeign` on the `purchaseorderitem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.

*/
-- DropForeignKey
-- ALTER TABLE `purchaseorderbill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `purchaseorderbill`;

-- AlterTable
ALTER TABLE `PurchaseOrder` MODIFY `subTotal` DECIMAL(12, 4) NULL,
    MODIFY `foreignGrandTotal` DECIMAL(12, 4) NULL,
    MODIFY `foreignSubTotal` DECIMAL(12, 4) NULL;

-- AlterTable
-- ALTER TABLE `purchaseorderbill` DROP COLUMN `debitNoteId`;

-- AlterTable
ALTER TABLE `PurchaseOrderItem` MODIFY `rate` DECIMAL(12, 4) NOT NULL,
    MODIFY `total` DECIMAL(12, 4) NOT NULL,
    MODIFY `amountInForeign` DECIMAL(12, 4) NULL;
