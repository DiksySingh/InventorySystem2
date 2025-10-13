-- AlterTable
ALTER TABLE `Service_Process_Record` ADD COLUMN `finalRemarks` VARCHAR(191) NULL,
    ADD COLUMN `finalStatus` VARCHAR(191) NULL,
    ADD COLUMN `isClosed` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `StageActivity` ADD COLUMN `acceptedAt` DATETIME(3) NULL,
    ADD COLUMN `completedAt` DATETIME(3) NULL,
    ADD COLUMN `outcome` VARCHAR(191) NULL,
    ADD COLUMN `startedAt` DATETIME(3) NULL;
