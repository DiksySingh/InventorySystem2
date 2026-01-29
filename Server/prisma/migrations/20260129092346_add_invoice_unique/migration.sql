/*
  Warnings:

  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[vendorId,poId,invoiceNumber]` on the table `VendorInvoices` will be added. If there are existing duplicate values, this will fail.

*/
-- -- DropForeignKey
-- ALTER TABLE `purchaseorderbill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- -- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `purchaseorderbill`;

-- -- AlterTable
-- ALTER TABLE `purchaseorderbill` DROP COLUMN `debitNoteId`;

-- CreateIndex
CREATE UNIQUE INDEX `VendorInvoices_vendorId_poId_invoiceNumber_key` ON `VendorInvoices`(`vendorId`, `poId`, `invoiceNumber`);
