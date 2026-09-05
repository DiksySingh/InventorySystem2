-- AlterTable
ALTER TABLE `purchaseorder` MODIFY `foreignGrandTotal` DECIMAL(15, 4) NULL,
    MODIFY `foreignSubTotal` DECIMAL(15, 4) NULL,
    MODIFY `fixedGrandTotal` DECIMAL(15, 4) NULL;

