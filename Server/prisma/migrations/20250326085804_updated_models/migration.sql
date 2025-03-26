/*
  Warnings:

  - You are about to drop the column `timestamp` on the `stockmovement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `stockmovement` DROP COLUMN `timestamp`,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `userId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
