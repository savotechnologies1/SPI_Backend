-- AlterTable
ALTER TABLE `ProductTree` ADD COLUMN `partNumberPart_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `StockOrderSchedule` ADD COLUMN `quantity` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `ProductTree` ADD CONSTRAINT `ProductTree_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductTree` ADD CONSTRAINT `ProductTree_partNumberPart_id_fkey` FOREIGN KEY (`partNumberPart_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;
