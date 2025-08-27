-- AlterTable
ALTER TABLE `Service_Process_Record` ADD COLUMN `isRepaired` BOOLEAN NULL;

-- AlterTable
ALTER TABLE `ServiceRecord` ADD COLUMN `initialRCA` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `StockMovement` ADD COLUMN `batchId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `StageRawMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `stageId` VARCHAR(191) NULL,
    `rawMaterialId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `StageRawMaterial_stageId_rawMaterialId_key`(`stageId`, `rawMaterialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovementBatch` (
    `id` VARCHAR(191) NOT NULL,
    `billPhotos` JSON NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BOMEntry` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NULL,
    `rawMaterialId` VARCHAR(191) NULL,
    `quantity` DOUBLE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StageRawMaterial` ADD CONSTRAINT `StageRawMaterial_stageId_fkey` FOREIGN KEY (`stageId`) REFERENCES `Stage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StageRawMaterial` ADD CONSTRAINT `StageRawMaterial_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `StockMovementBatch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
