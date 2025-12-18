/*
  Warnings:

  - You are about to alter the column `quantity` on the `damagedstock` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal(10,2)`.
  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `DamagedStock` ADD COLUMN `amountInForeign` DECIMAL(12, 2) NULL,
    ADD COLUMN `gstRate` DECIMAL(5, 2) NULL,
    ADD COLUMN `hsnCode` VARCHAR(191) NULL,
    ADD COLUMN `itemDetail` VARCHAR(500) NULL,
    ADD COLUMN `itemGSTType` VARCHAR(191) NULL,
    ADD COLUMN `modelNumber` VARCHAR(191) NULL,
    ADD COLUMN `rate` DECIMAL(10, 2) NULL,
    ADD COLUMN `rateInForeign` DECIMAL(12, 4) NULL,
    ADD COLUMN `receivedQty` DECIMAL(10, 2) NULL DEFAULT 0,
    ADD COLUMN `total` DECIMAL(12, 2) NULL,
    ADD COLUMN `unit` VARCHAR(191) NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL,
    ADD COLUMN `userId` VARCHAR(191) NULL,
    MODIFY `quantity` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `DebitNote` MODIFY `status` ENUM('Pending', 'Debited', 'Received') NOT NULL DEFAULT 'Pending';

-- CreateTable
CREATE TABLE `DebitNoteBill` (
    `id` VARCHAR(191) NOT NULL,
    `debitNoteId` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DamagedStock` ADD CONSTRAINT `DamagedStock_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DamagedStock` ADD CONSTRAINT `DamagedStock_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DebitNoteBill` ADD CONSTRAINT `DebitNoteBill_debitNoteId_fkey` FOREIGN KEY (`debitNoteId`) REFERENCES `DebitNote`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
