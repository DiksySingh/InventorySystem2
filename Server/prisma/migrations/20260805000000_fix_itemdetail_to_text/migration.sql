-- AlterTable: change itemDetail from VARCHAR(500) to TEXT in PurchaseOrderItem
ALTER TABLE `PurchaseOrderItem` MODIFY COLUMN `itemDetail` TEXT NULL;

-- AlterTable: change itemDetail from VARCHAR(500) to TEXT in DamagedStock
ALTER TABLE `DamagedStock` MODIFY COLUMN `itemDetail` TEXT NULL;
