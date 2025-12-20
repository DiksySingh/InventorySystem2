/*
  Warnings:

  - You are about to alter the column `quantity` on the `damagedstock` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(12,4)`.
  - You are about to alter the column `amountInForeign` on the `damagedstock` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `gstRate` on the `damagedstock` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Decimal(7,4)`.
  - You are about to alter the column `rate` on the `damagedstock` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(12,4)`.
  - You are about to alter the column `receivedQty` on the `damagedstock` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(12,4)`.
  - You are about to alter the column `total` on the `damagedstock` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `gstRate` on the `debitnote` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Decimal(7,4)`.
  - You are about to alter the column `foreignSubTotal` on the `debitnote` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `foreignGrandTotal` on the `debitnote` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `subTotal` on the `debitnote` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `totalCGST` on the `debitnote` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `totalSGST` on the `debitnote` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `totalIGST` on the `debitnote` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `totalGST` on the `debitnote` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `grandTotal` on the `debitnote` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.

*/
-- DropForeignKey
-- ALTER TABLE `purchaseorderbill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `purchaseorderbill`;

-- AlterTable
ALTER TABLE `DamagedStock` MODIFY `quantity` DECIMAL(12, 4) NOT NULL,
    MODIFY `amountInForeign` DECIMAL(12, 4) NULL,
    MODIFY `gstRate` DECIMAL(7, 4) NULL,
    MODIFY `rate` DECIMAL(12, 4) NULL,
    MODIFY `receivedQty` DECIMAL(12, 4) NULL DEFAULT 0,
    MODIFY `total` DECIMAL(12, 4) NULL;

-- AlterTable
ALTER TABLE `DebitNote` ADD COLUMN `approvalStatus` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `approvedBy` VARCHAR(191) NULL,
    ADD COLUMN `rejectionReason` VARCHAR(191) NULL,
    ADD COLUMN `warehouseId` VARCHAR(191) NULL,
    MODIFY `gstRate` DECIMAL(7, 4) NULL,
    MODIFY `foreignSubTotal` DECIMAL(12, 4) NULL,
    MODIFY `foreignGrandTotal` DECIMAL(12, 4) NULL,
    MODIFY `subTotal` DECIMAL(12, 4) NULL,
    MODIFY `totalCGST` DECIMAL(12, 4) NULL,
    MODIFY `totalSGST` DECIMAL(12, 4) NULL,
    MODIFY `totalIGST` DECIMAL(12, 4) NULL,
    MODIFY `totalGST` DECIMAL(12, 4) NULL,
    MODIFY `grandTotal` DECIMAL(12, 4) NULL;

-- AlterTable
ALTER TABLE `PurchaseOrder` ADD COLUMN `approvalStatus` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
    ADD COLUMN `approvedAt` DATETIME(3) NULL,
    ADD COLUMN `approvedBy` VARCHAR(191) NULL,
    ADD COLUMN `rejectionReason` VARCHAR(191) NULL,
    ADD COLUMN `warehouseId` VARCHAR(191) NULL;

-- AlterTable
-- ALTER TABLE `purchaseorderbill` DROP COLUMN `debitNoteId`;

-- AlterTable
ALTER TABLE `Terms_Conditions` ADD COLUMN `isActive` BOOLEAN NULL DEFAULT true;

-- CreateTable
CREATE TABLE `PurchaseOrDebitNoteTerm` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseOrderId` VARCHAR(191) NULL,
    `debitNoteId` VARCHAR(191) NULL,
    `termId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PurchaseOrDebitNoteTerm_purchaseOrderId_idx`(`purchaseOrderId`),
    INDEX `PurchaseOrDebitNoteTerm_debitNoteId_idx`(`debitNoteId`),
    UNIQUE INDEX `PurchaseOrDebitNoteTerm_purchaseOrderId_termId_key`(`purchaseOrderId`, `termId`),
    UNIQUE INDEX `PurchaseOrDebitNoteTerm_debitNoteId_termId_key`(`debitNoteId`, `termId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PurchaseOrDebitNoteTerm` ADD CONSTRAINT `PurchaseOrDebitNoteTerm_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrDebitNoteTerm` ADD CONSTRAINT `PurchaseOrDebitNoteTerm_debitNoteId_fkey` FOREIGN KEY (`debitNoteId`) REFERENCES `DebitNote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrDebitNoteTerm` ADD CONSTRAINT `PurchaseOrDebitNoteTerm_termId_fkey` FOREIGN KEY (`termId`) REFERENCES `Terms_Conditions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
