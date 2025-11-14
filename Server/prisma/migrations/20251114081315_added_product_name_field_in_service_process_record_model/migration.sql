/*
  Warnings:

  - You are about to drop the column `item` on the `service_process_record` table. All the data in the column will be lost.
  - You are about to drop the column `subItem` on the `service_process_record` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Service_Process_Record` DROP COLUMN `item`,
    DROP COLUMN `subItem`,
    ADD COLUMN `itemName` VARCHAR(191) NULL,
    ADD COLUMN `productName` VARCHAR(191) NULL,
    ADD COLUMN `subItemName` VARCHAR(191) NULL;
