/*
  Warnings:

  - Added the required column `updatedAt` to the `ItemRawMaterial` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ItemRawMaterial` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `updatedBy` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `ItemRawMaterial` ADD CONSTRAINT `ItemRawMaterial_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
