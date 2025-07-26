-- CreateTable
CREATE TABLE `Stage` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Stage_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemType` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ItemType_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StageActivity` (
    `id` VARCHAR(191) NOT NULL,
    `serviceProcessId` VARCHAR(191) NULL,
    `empId` VARCHAR(191) NULL,
    `stageId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `isCurrent` BOOLEAN NOT NULL DEFAULT false,
    `failureReason` ENUM('VIBRATION', 'OVERLOAD', 'EARTHING', 'OTHER') NULL,
    `remarks` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemType_Stage` (
    `id` VARCHAR(191) NOT NULL,
    `itemTypeId` VARCHAR(191) NULL,
    `stageId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemRequestData` (
    `id` VARCHAR(191) NOT NULL,
    `serviceProcessId` VARCHAR(191) NULL,
    `isProcessRequest` BOOLEAN NOT NULL DEFAULT false,
    `rawMaterialRequested` JSON NULL,
    `requestedTo` VARCHAR(191) NULL,
    `requestedBy` VARCHAR(191) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approved` BOOLEAN NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NOT NULL,
    `materialGiven` BOOLEAN NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service_Process_Record` (
    `id` VARCHAR(191) NOT NULL,
    `item` VARCHAR(191) NULL,
    `subItem` VARCHAR(191) NULL,
    `itemTypeId` VARCHAR(191) NULL,
    `serialNumber` VARCHAR(191) NULL,
    `stageId` VARCHAR(191) NULL,
    `initialStageId` VARCHAR(191) NULL,
    `restartedFromStageId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'FAILED', 'REDIRECTED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StageFlow` (
    `id` VARCHAR(191) NOT NULL,
    `itemTypeId` VARCHAR(191) NULL,
    `currentStageId` VARCHAR(191) NULL,
    `nextStageId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FailureRedirect` (
    `id` VARCHAR(191) NOT NULL,
    `itemTypeId` VARCHAR(191) NULL,
    `failureReason` ENUM('VIBRATION', 'OVERLOAD', 'EARTHING', 'OTHER') NOT NULL,
    `redirectStageId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemUsage` (
    `id` VARCHAR(191) NOT NULL,
    `serviceProcessId` VARCHAR(191) NULL,
    `empId` VARCHAR(191) NULL,
    `rawMaterialId` VARCHAR(191) NULL,
    `quantityUsed` DOUBLE NULL,
    `unit` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StageActivity` ADD CONSTRAINT `StageActivity_serviceProcessId_fkey` FOREIGN KEY (`serviceProcessId`) REFERENCES `Service_Process_Record`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StageActivity` ADD CONSTRAINT `StageActivity_stageId_fkey` FOREIGN KEY (`stageId`) REFERENCES `Stage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StageActivity` ADD CONSTRAINT `StageActivity_empId_fkey` FOREIGN KEY (`empId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemType_Stage` ADD CONSTRAINT `ItemType_Stage_itemTypeId_fkey` FOREIGN KEY (`itemTypeId`) REFERENCES `ItemType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemType_Stage` ADD CONSTRAINT `ItemType_Stage_stageId_fkey` FOREIGN KEY (`stageId`) REFERENCES `Stage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemRequestData` ADD CONSTRAINT `ItemRequestData_serviceProcessId_fkey` FOREIGN KEY (`serviceProcessId`) REFERENCES `Service_Process_Record`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemRequestData` ADD CONSTRAINT `ItemRequestData_requestedBy_fkey` FOREIGN KEY (`requestedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemRequestData` ADD CONSTRAINT `ItemRequestData_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemRequestData` ADD CONSTRAINT `ItemRequestData_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service_Process_Record` ADD CONSTRAINT `Service_Process_Record_itemTypeId_fkey` FOREIGN KEY (`itemTypeId`) REFERENCES `ItemType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service_Process_Record` ADD CONSTRAINT `Service_Process_Record_stageId_fkey` FOREIGN KEY (`stageId`) REFERENCES `Stage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service_Process_Record` ADD CONSTRAINT `Service_Process_Record_initialStageId_fkey` FOREIGN KEY (`initialStageId`) REFERENCES `Stage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service_Process_Record` ADD CONSTRAINT `Service_Process_Record_restartedFromStageId_fkey` FOREIGN KEY (`restartedFromStageId`) REFERENCES `Stage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service_Process_Record` ADD CONSTRAINT `Service_Process_Record_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service_Process_Record` ADD CONSTRAINT `Service_Process_Record_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StageFlow` ADD CONSTRAINT `StageFlow_itemTypeId_fkey` FOREIGN KEY (`itemTypeId`) REFERENCES `ItemType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StageFlow` ADD CONSTRAINT `StageFlow_currentStageId_fkey` FOREIGN KEY (`currentStageId`) REFERENCES `Stage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StageFlow` ADD CONSTRAINT `StageFlow_nextStageId_fkey` FOREIGN KEY (`nextStageId`) REFERENCES `Stage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FailureRedirect` ADD CONSTRAINT `FailureRedirect_itemTypeId_fkey` FOREIGN KEY (`itemTypeId`) REFERENCES `ItemType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FailureRedirect` ADD CONSTRAINT `FailureRedirect_redirectStageId_fkey` FOREIGN KEY (`redirectStageId`) REFERENCES `Stage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemUsage` ADD CONSTRAINT `ItemUsage_rawMaterialId_fkey` FOREIGN KEY (`rawMaterialId`) REFERENCES `RawMaterial`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemUsage` ADD CONSTRAINT `ItemUsage_serviceProcessId_fkey` FOREIGN KEY (`serviceProcessId`) REFERENCES `Service_Process_Record`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemUsage` ADD CONSTRAINT `ItemUsage_empId_fkey` FOREIGN KEY (`empId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
