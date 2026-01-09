/*
  Warnings:

  - You are about to drop the column `mode` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the column `referenceNo` on the `payment` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `payment` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `payment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.

*/
-- DropForeignKey
-- ALTER TABLE `purchaseorderbill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- -- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `purchaseorderbill`;

-- AlterTable
ALTER TABLE `Company` ADD COLUMN `accountHolder` VARCHAR(191) NULL,
    ADD COLUMN `accountNumber` VARCHAR(191) NULL,
    ADD COLUMN `bankName` VARCHAR(191) NULL,
    ADD COLUMN `companyAadhaar` VARCHAR(191) NULL,
    ADD COLUMN `companyPanCard` VARCHAR(191) NULL,
    ADD COLUMN `ifscCode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `DebitNote` ADD COLUMN `warehouseName` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Payment` DROP COLUMN `mode`,
    DROP COLUMN `referenceNo`,
    DROP COLUMN `remarks`,
    ADD COLUMN `adminApprovalDate` DATETIME(3) NULL,
    ADD COLUMN `adminApprovalStatus` BOOLEAN NULL,
    ADD COLUMN `adminRemark` VARCHAR(191) NULL,
    ADD COLUMN `approvedByAdmin` VARCHAR(191) NULL,
    ADD COLUMN `billpaymentType` ENUM('Advance_Payment', 'Partial_Payment', 'Full_Payment') NULL,
    ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `docApprovalDate` DATETIME(3) NULL,
    ADD COLUMN `docApprovalRemark` VARCHAR(191) NULL,
    ADD COLUMN `docApprovalStatus` BOOLEAN NULL,
    ADD COLUMN `docApprovedBy` VARCHAR(191) NULL,
    ADD COLUMN `paymentRemark` VARCHAR(191) NULL,
    ADD COLUMN `paymentRequestedBy` VARCHAR(191) NULL,
    ADD COLUMN `paymentStatus` BOOLEAN NULL,
    ADD COLUMN `paymentTransferredBy` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL,
    MODIFY `paymentDate` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `amount` DECIMAL(12, 4) NOT NULL,
    MODIFY `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
-- ALTER TABLE `purchaseorderbill` DROP COLUMN `debitNoteId`;

-- AlterTable
ALTER TABLE `Vendor` ADD COLUMN `accountHolder` VARCHAR(191) NULL,
    ADD COLUMN `accountNumber` VARCHAR(191) NULL,
    ADD COLUMN `bankName` VARCHAR(191) NULL,
    ADD COLUMN `ifscCode` VARCHAR(191) NULL,
    ADD COLUMN `vendorAadhaar` VARCHAR(191) NULL,
    ADD COLUMN `vendorPanCard` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Payment_createdBy_idx` ON `Payment`(`createdBy`);

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_paymentRequestedBy_fkey` FOREIGN KEY (`paymentRequestedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_docApprovedBy_fkey` FOREIGN KEY (`docApprovedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_approvedByAdmin_fkey` FOREIGN KEY (`approvedByAdmin`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_paymentTransferredBy_fkey` FOREIGN KEY (`paymentTransferredBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `Payment` RENAME INDEX `Payment_debitNoteId_fkey` TO `Payment_debitNoteId_idx`;

-- RenameIndex
ALTER TABLE `Payment` RENAME INDEX `Payment_poId_fkey` TO `Payment_poId_idx`;
