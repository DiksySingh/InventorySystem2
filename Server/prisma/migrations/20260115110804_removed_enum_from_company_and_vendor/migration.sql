/*
  Warnings:

  - You are about to alter the column `country` on the `company` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(8))` to `VarChar(191)`.
  - You are about to alter the column `currency` on the `company` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(10))` to `VarChar(191)`.
  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.
  - You are about to alter the column `country` on the `vendor` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(5))` to `VarChar(191)`.
  - You are about to alter the column `currency` on the `vendor` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(6))` to `VarChar(191)`.

*/
-- -- DropForeignKey
-- ALTER TABLE `purchaseorderbill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- -- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `purchaseorderbill`;

-- AlterTable
ALTER TABLE `Company` MODIFY `country` VARCHAR(191) NULL DEFAULT 'INDIA',
    MODIFY `currency` VARCHAR(191) NULL DEFAULT 'INR';

-- -- AlterTable
-- ALTER TABLE `purchaseorderbill` DROP COLUMN `debitNoteId`;

-- AlterTable
ALTER TABLE `Vendor` MODIFY `country` VARCHAR(191) NULL DEFAULT 'INDIA',
    MODIFY `currency` VARCHAR(191) NULL DEFAULT 'INR';
