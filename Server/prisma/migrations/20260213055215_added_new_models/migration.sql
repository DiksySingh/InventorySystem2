/*
  Warnings:

  - You are about to drop the column `debitNoteId` on the `purchaseorderbill` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[warehouseId,infraItemId]` on the table `WarehouseStock` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[warehouseId,toolEquipmentId]` on the table `WarehouseStock` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
-- ALTER TABLE `purchaseorderbill` DROP FOREIGN KEY `PurchaseOrderBill_debitNoteId_fkey`;

-- -- DropIndex
-- DROP INDEX `PurchaseOrderBill_debitNoteId_fkey` ON `purchaseorderbill`;

-- -- AlterTable
-- ALTER TABLE `purchaseorderbill` DROP COLUMN `debitNoteId`;

-- AlterTable
ALTER TABLE `StockMovement` ADD COLUMN `infraItemId` VARCHAR(191) NULL,
    ADD COLUMN `toolEquipmentId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `WarehouseStock` ADD COLUMN `damagedQty` DOUBLE NULL DEFAULT 0,
    ADD COLUMN `infraItemId` VARCHAR(191) NULL,
    ADD COLUMN `itemType` ENUM('RAW', 'INFRA', 'TOOL') NULL,
    ADD COLUMN `toolEquipmentId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `InfraMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `hsnCode` VARCHAR(191) NULL,
    `conversionUnit` VARCHAR(191) NULL,
    `conversionFactor` DOUBLE NULL,
    `isUsed` BOOLEAN NULL DEFAULT true,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `InfraMaterial_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ToolsEquipments` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `hsnCode` VARCHAR(191) NULL,
    `conversionUnit` VARCHAR(191) NULL,
    `conversionFactor` DOUBLE NULL,
    `isUsed` BOOLEAN NULL DEFAULT true,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `ToolsEquipments_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `WarehouseStock_warehouseId_infraItemId_key` ON `WarehouseStock`(`warehouseId`, `infraItemId`);

-- CreateIndex
CREATE UNIQUE INDEX `WarehouseStock_warehouseId_toolEquipmentId_key` ON `WarehouseStock`(`warehouseId`, `toolEquipmentId`);

-- AddForeignKey
ALTER TABLE `WarehouseStock` ADD CONSTRAINT `WarehouseStock_infraItemId_fkey` FOREIGN KEY (`infraItemId`) REFERENCES `InfraMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WarehouseStock` ADD CONSTRAINT `WarehouseStock_toolEquipmentId_fkey` FOREIGN KEY (`toolEquipmentId`) REFERENCES `ToolsEquipments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_infraItemId_fkey` FOREIGN KEY (`infraItemId`) REFERENCES `InfraMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_toolEquipmentId_fkey` FOREIGN KEY (`toolEquipmentId`) REFERENCES `ToolsEquipments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InfraMaterial` ADD CONSTRAINT `InfraMaterial_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InfraMaterial` ADD CONSTRAINT `InfraMaterial_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ToolsEquipments` ADD CONSTRAINT `ToolsEquipments_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ToolsEquipments` ADD CONSTRAINT `ToolsEquipments_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
