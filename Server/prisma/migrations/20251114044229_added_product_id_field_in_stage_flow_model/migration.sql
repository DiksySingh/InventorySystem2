/*
  Warnings:

  - The values [Sent] on the enum `PurchaseOrder_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `status` on the `purchaseorderreceipt` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `PurchaseOrder` MODIFY `status` ENUM('Draft', 'Generated_Downloaded', 'PartiallyReceived', 'Received', 'Cancelled') NOT NULL DEFAULT 'Draft';

-- AlterTable
ALTER TABLE `PurchaseOrderReceipt` DROP COLUMN `status`,
    ADD COLUMN `receivingBill` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Service_Process_Record` ADD COLUMN `completedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `StageActivity` MODIFY `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'REJECTED', 'SKIPPED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `StageFlow` ADD COLUMN `productId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `PurchaseOrderBill` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseOrderId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `uploadedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StageFlow` ADD CONSTRAINT `StageFlow_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderBill` ADD CONSTRAINT `PurchaseOrderBill_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
