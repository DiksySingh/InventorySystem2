-- AlterTable
ALTER TABLE `FailureRedirect` ADD COLUMN `productId` VARCHAR(191) NULL,
    MODIFY `failureReason` ENUM('VIBRATION', 'OVERLOAD', 'EARTHING', 'LEAKAGE', 'OTHER') NOT NULL;

-- AlterTable
ALTER TABLE `Service_Process_Record` ADD COLUMN `disassembleSessionId` VARCHAR(191) NULL,
    ADD COLUMN `disassembleStatus` ENUM('PENDING', 'IN_PROGRESS', 'FAILED', 'REDIRECTED', 'COMPLETED') NULL,
    ADD COLUMN `isDisassemblePending` BOOLEAN NULL DEFAULT false;

-- AlterTable
ALTER TABLE `StageActivity` MODIFY `failureReason` ENUM('VIBRATION', 'OVERLOAD', 'EARTHING', 'LEAKAGE', 'OTHER') NULL;

-- CreateTable
CREATE TABLE `Disassemble_Reusable_Items` (
    `id` VARCHAR(191) NOT NULL,
    `serviceProcessId` VARCHAR(191) NOT NULL,
    `empId` VARCHAR(191) NULL,
    `assembleEmpId` VARCHAR(191) NULL,
    `reusableItems` JSON NULL,
    `remarks` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FailureRedirect` ADD CONSTRAINT `FailureRedirect_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Disassemble_Reusable_Items` ADD CONSTRAINT `Disassemble_Reusable_Items_empId_fkey` FOREIGN KEY (`empId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Disassemble_Reusable_Items` ADD CONSTRAINT `Disassemble_Reusable_Items_assembleEmpId_fkey` FOREIGN KEY (`assembleEmpId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Disassemble_Reusable_Items` ADD CONSTRAINT `Disassemble_Reusable_Items_serviceProcessId_fkey` FOREIGN KEY (`serviceProcessId`) REFERENCES `Service_Process_Record`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
