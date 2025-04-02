/*
  Warnings:

  - You are about to drop the column `repairedBy` on the `servicerecord` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ServiceRecord` CHANGE COLUMN `repairedBy` `repairedRejectedBy` VARCHAR(191);

