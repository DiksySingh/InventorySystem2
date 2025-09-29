-- AlterTable
ALTER TABLE `StockMovementBatch` ADD COLUMN `createdBy` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `StockMovementBatch` ADD CONSTRAINT `StockMovementBatch_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
