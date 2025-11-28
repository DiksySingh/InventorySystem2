-- AlterTable
ALTER TABLE `ItemRequestData` ADD COLUMN `declined` BOOLEAN NULL,
    ADD COLUMN `declinedAt` DATETIME(3) NULL,
    ADD COLUMN `declinedBy` VARCHAR(191) NULL,
    ADD COLUMN `declinedRemarks` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `ItemRequestData` ADD CONSTRAINT `ItemRequestData_declinedBy_fkey` FOREIGN KEY (`declinedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
