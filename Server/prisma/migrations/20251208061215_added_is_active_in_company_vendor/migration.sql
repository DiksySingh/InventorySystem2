-- AlterTable
ALTER TABLE `Company` ADD COLUMN `isActive` BOOLEAN NULL DEFAULT true;

-- AlterTable
ALTER TABLE `Vendor` ADD COLUMN `isActive` BOOLEAN NULL DEFAULT true;
