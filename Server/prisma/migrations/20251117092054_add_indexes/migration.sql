-- CreateIndex
CREATE INDEX `Service_Process_Record_serialNumber_idx` ON `Service_Process_Record`(`serialNumber`);

-- CreateIndex
CREATE INDEX `Service_Process_Record_itemName_idx` ON `Service_Process_Record`(`itemName`);

-- CreateIndex
CREATE INDEX `Service_Process_Record_subItemName_idx` ON `Service_Process_Record`(`subItemName`);

-- CreateIndex
CREATE INDEX `Service_Process_Record_createdAt_idx` ON `Service_Process_Record`(`createdAt`);

-- CreateIndex
CREATE INDEX `Service_Process_Record_status_idx` ON `Service_Process_Record`(`status`);

-- RenameIndex
ALTER TABLE `Service_Process_Record` RENAME INDEX `Service_Process_Record_itemTypeId_fkey` TO `Service_Process_Record_itemTypeId_idx`;

-- RenameIndex
ALTER TABLE `Service_Process_Record` RENAME INDEX `Service_Process_Record_stageId_fkey` TO `Service_Process_Record_stageId_idx`;
