-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `roleId` VARCHAR(191) NULL,
    `block` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `isActive` BOOLEAN NULL,
    `refreshToken` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_roleId_fkey`(`roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Warehouse` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Warehouse_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Item` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Item_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RawMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `stock` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RawMaterial_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemRawMaterial` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NULL,
    `rawMaterialId` VARCHAR(191) NULL,
    `quantity` DOUBLE NULL,

    INDEX `ItemRawMaterial_rawMaterialId_fkey`(`rawMaterialId`),
    UNIQUE INDEX `ItemRawMaterial_itemId_rawMaterialId_key`(`itemId`, `rawMaterialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` VARCHAR(191) NOT NULL,
    `rawMaterialId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `warehouseId` VARCHAR(191) NULL,
    `quantity` DOUBLE NULL,
    `type` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockMovement_rawMaterialId_fkey`(`rawMaterialId`),
    INDEX `StockMovement_warehouseId_fkey`(`warehouseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ManufacturingUsage` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NULL,
    `rawMaterialId` VARCHAR(191) NULL,
    `quantityUsed` DOUBLE NULL,
    `manufacturingDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ManufacturingUsage_itemId_fkey`(`itemId`),
    INDEX `ManufacturingUsage_rawMaterialId_fkey`(`rawMaterialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceRecord` (
    `id` VARCHAR(191) NOT NULL,
    `item` VARCHAR(191) NULL,
    `subItem` VARCHAR(191) NULL,
    `quantity` DOUBLE NULL,
    `serialNumber` VARCHAR(191) NULL,
    `faultAnalysis` VARCHAR(191) NULL,
    `isRepaired` INTEGER NULL,
    `repairedBy` VARCHAR(191) NULL,
    `remarks` VARCHAR(191) NULL,
    `repairedParts` JSON NULL,
    `userId` VARCHAR(191) NOT NULL,
    `servicedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceRecord_serialNumber_idx`(`serialNumber`),
    INDEX `ServiceRecord_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceUsage` (
    `id` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NOT NULL,
    `rawMaterialId` VARCHAR(191) NULL,
    `quantityUsed` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceUsage_serviceId_fkey`(`serviceId`),
    INDEX `ServiceUsage_rawMaterialId_fkey`(`rawMaterialId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemRawMaterial` ADD CONSTRAINT `ItemRawMaterial_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemRawMaterial` ADD CONSTRAINT `ItemRawMaterial_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManufacturingUsage` ADD CONSTRAINT `ManufacturingUsage_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ManufacturingUsage` ADD CONSTRAINT `ManufacturingUsage_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceRecord` ADD CONSTRAINT `ServiceRecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceUsage` ADD CONSTRAINT `ServiceUsage_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceUsage` ADD CONSTRAINT `ServiceUsage_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `ServiceRecord`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
