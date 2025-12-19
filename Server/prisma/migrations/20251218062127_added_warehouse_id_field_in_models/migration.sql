/*
  Warnings:

  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.

*/
-- -- DropForeignKey
-- ALTER TABLE `PurchaseOrderBill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- -- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `purchaseorderbill`;

-- AlterTable
ALTER TABLE `ItemRequestData` ADD COLUMN `warehouseId` VARCHAR(191) NULL;

-- AlterTable
-- ALTER TABLE `PurchaseOrderBill` DROP COLUMN `debitNoteId`;

-- AlterTable
ALTER TABLE `Service_Process_Record` ADD COLUMN `warehouseId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `warehouseId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `WarehouseStock` (
    `id` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NULL,
    `rawMaterialId` VARCHAR(191) NULL,
    `quantity` DOUBLE NULL DEFAULT 0,
    `unit` VARCHAR(191) NULL,
    `isUsed` BOOLEAN NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WarehouseStock_warehouseId_idx`(`warehouseId`),
    UNIQUE INDEX `WarehouseStock_warehouseId_rawMaterialId_key`(`warehouseId`, `rawMaterialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WarehouseStock` ADD CONSTRAINT `WarehouseStock_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
