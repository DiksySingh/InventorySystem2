-- AlterTable
ALTER TABLE `RawMaterial` ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `minQty` DOUBLE NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `RawMaterial` ADD CONSTRAINT `RawMaterial_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawMaterial` ADD CONSTRAINT `RawMaterial_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
