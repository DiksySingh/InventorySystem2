-- AlterTable
ALTER TABLE `ItemRawMaterial` ADD COLUMN `itemModelId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Item_Model` (
    `id` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ItemRawMaterial` ADD CONSTRAINT `ItemRawMaterial_itemModelId_fkey` FOREIGN KEY (`itemModelId`) REFERENCES `Item_Model`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
