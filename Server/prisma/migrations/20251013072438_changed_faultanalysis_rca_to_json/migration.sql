/*
  Warnings:

  - You are about to alter the column `faultAnalysis` on the `servicerecord` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.
  - You are about to alter the column `initialRCA` on the `servicerecord` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.

*/
-- AlterTable
ALTER TABLE `ServiceRecord` MODIFY `faultAnalysis` JSON NULL,
    MODIFY `initialRCA` JSON NULL;
