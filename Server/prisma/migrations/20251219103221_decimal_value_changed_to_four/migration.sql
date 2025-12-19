/*
  Warnings:

  - The values [OTHER] on the enum `Vendor_country` will be removed. If these variants are still used in the database, this will fail.
  - The values [OTHER] on the enum `Vendor_currency` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `totalCGST` on the `purchaseorder` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `totalSGST` on the `purchaseorder` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `totalIGST` on the `purchaseorder` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `totalGST` on the `purchaseorder` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `grandTotal` on the `purchaseorder` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(12,4)`.
  - You are about to alter the column `gstRate` on the `purchaseorder` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Decimal(7,4)`.
  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.
  - You are about to alter the column `gstRate` on the `purchaseorderitem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,2)` to `Decimal(7,4)`.
  - You are about to alter the column `quantity` on the `purchaseorderitem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(12,4)`.
  - You are about to alter the column `receivedQty` on the `purchaseorderitem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(12,4)`.
  - The values [OTHER] on the enum `Vendor_country` will be removed. If these variants are still used in the database, this will fail.
  - The values [OTHER] on the enum `Vendor_currency` will be removed. If these variants are still used in the database, this will fail.

*/
-- DropForeignKey
-- ALTER TABLE `purchaseorderbill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `purchaseorderbill`;

-- AlterTable
ALTER TABLE `Company` MODIFY `country` ENUM('INDIA', 'USA', 'UAE', 'UK', 'CHINA', 'RUSSIA') NOT NULL DEFAULT 'INDIA',
    MODIFY `currency` ENUM('INR', 'USD', 'EUR', 'GBP', 'AED', 'CNY') NOT NULL DEFAULT 'INR';

-- AlterTable
ALTER TABLE `PurchaseOrder` MODIFY `totalCGST` DECIMAL(12, 4) NULL,
    MODIFY `totalSGST` DECIMAL(12, 4) NULL,
    MODIFY `totalIGST` DECIMAL(12, 4) NULL,
    MODIFY `totalGST` DECIMAL(12, 4) NULL,
    MODIFY `grandTotal` DECIMAL(12, 4) NULL,
    MODIFY `gstRate` DECIMAL(7, 4) NULL;

-- AlterTable
-- ALTER TABLE `purchaseorderbill` DROP COLUMN `debitNoteId`;

-- AlterTable
ALTER TABLE `PurchaseOrderItem` MODIFY `gstRate` DECIMAL(7, 4) NULL,
    MODIFY `quantity` DECIMAL(12, 4) NOT NULL,
    MODIFY `receivedQty` DECIMAL(12, 4) NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `Vendor` MODIFY `country` ENUM('INDIA', 'USA', 'UAE', 'UK', 'CHINA', 'RUSSIA') NOT NULL DEFAULT 'INDIA',
    MODIFY `currency` ENUM('INR', 'USD', 'EUR', 'GBP', 'AED', 'CNY') NOT NULL DEFAULT 'INR';
