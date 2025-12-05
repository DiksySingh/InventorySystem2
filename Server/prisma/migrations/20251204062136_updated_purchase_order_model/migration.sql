-- AlterTable
ALTER TABLE `PurchaseOrderItem` ADD COLUMN `amountInForeign` DECIMAL(12, 2) NULL,
    ADD COLUMN `rateInForeign` DECIMAL(12, 4) NULL;

-- AlterTable
ALTER TABLE `Vendor` ADD COLUMN `exchangeRate` DECIMAL(65, 30) NULL;
