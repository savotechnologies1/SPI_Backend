/*
  Warnings:

  - You are about to drop the column `partNumberPart_id` on the `StockOrderSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `productTreeId` on the `StockOrderSchedule` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `ProductTree` DROP FOREIGN KEY `ProductTree_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `StockOrderSchedule` DROP FOREIGN KEY `StockOrderSchedule_product_id_fkey`;

-- DropIndex
DROP INDEX `ProductTree_product_id_key` ON `ProductTree`;

-- DropIndex
DROP INDEX `ProductionResponse_product_id_fkey` ON `StockOrderSchedule`;

-- AlterTable
ALTER TABLE `ProductTree` ADD COLUMN `stockOrderId` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `StockOrderSchedule` DROP COLUMN `partNumberPart_id`,
    DROP COLUMN `productTreeId`,
    ADD COLUMN `employeeId` CHAR(100) NULL;

-- AddForeignKey
ALTER TABLE `ProductTree` ADD CONSTRAINT `ProductTree_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductTree` ADD CONSTRAINT `ProductTree_stockOrderId_fkey` FOREIGN KEY (`stockOrderId`) REFERENCES `StockOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;
