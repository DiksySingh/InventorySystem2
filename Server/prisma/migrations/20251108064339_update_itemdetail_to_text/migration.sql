-- DropForeignKey
ALTER TABLE `PurchaseOrderReceipt` DROP FOREIGN KEY `PurchaseOrderReceipt_purchaseOrderId_fkey`;

-- DropForeignKey
ALTER TABLE `PurchaseOrderReceipt` DROP FOREIGN KEY `PurchaseOrderReceipt_purchaseOrderItemId_fkey`;

-- DropIndex
DROP INDEX `PurchaseOrderReceipt_purchaseOrderId_fkey` ON `PurchaseOrderReceipt`;

-- DropIndex
DROP INDEX `PurchaseOrderReceipt_purchaseOrderItemId_fkey` ON `PurchaseOrderReceipt`;

-- AlterTable
ALTER TABLE `PurchaseOrderItem` MODIFY `itemDetail` VARCHAR(500) NULL;

-- AlterTable
ALTER TABLE `PurchaseOrderReceipt` ADD COLUMN `itemName` VARCHAR(191) NULL,
    MODIFY `purchaseOrderId` VARCHAR(191) NULL,
    MODIFY `purchaseOrderItemId` VARCHAR(191) NULL,
    MODIFY `itemId` VARCHAR(191) NULL,
    MODIFY `itemSource` VARCHAR(191) NULL,
    MODIFY `receivedQty` DECIMAL(10, 2) NULL,
    MODIFY `goodQty` DECIMAL(10, 2) NULL DEFAULT 0,
    MODIFY `damagedQty` DECIMAL(10, 2) NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `DamagedStock` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseOrderId` VARCHAR(191) NULL,
    `itemId` VARCHAR(191) NULL,
    `itemSource` VARCHAR(191) NULL,
    `itemName` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `remarks` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PurchaseOrderReceipt` ADD CONSTRAINT `PurchaseOrderReceipt_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrderReceipt` ADD CONSTRAINT `PurchaseOrderReceipt_purchaseOrderItemId_fkey` FOREIGN KEY (`purchaseOrderItemId`) REFERENCES `PurchaseOrderItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DamagedStock` ADD CONSTRAINT `DamagedStock_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DamagedStock` ADD CONSTRAINT `DamagedStock_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
