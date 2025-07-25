/*
  Warnings:

  - A unique constraint covering the columns `[product_id]` on the table `ProductTree` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `StockOrderSchedule` DROP FOREIGN KEY `StockOrderSchedule_product_id_fkey`;

-- AlterTable
ALTER TABLE `StockOrderSchedule` ADD COLUMN `partNumberPart_id` CHAR(36) NULL,
    ADD COLUMN `productTreeId` CHAR(36) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ProductTree_product_id_key` ON `ProductTree`(`product_id`);

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `ProductTree`(`product_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `StockOrderSchedule` RENAME INDEX `StockOrderSchedule_product_id_fkey` TO `ProductionResponse_product_id_fkey`;
