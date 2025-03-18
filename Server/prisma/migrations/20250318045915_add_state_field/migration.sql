/*
  Warnings:

  - You are about to drop the column `location` on the `warehouse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `servicerecord` ADD COLUMN `remark` VARCHAR(191) NULL,
    ADD COLUMN `status` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `warehouse` DROP COLUMN `location`,
    ADD COLUMN `state` VARCHAR(191) NULL;
